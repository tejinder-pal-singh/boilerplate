import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { AuthService } from '../../auth/auth.service';
import { PaymentsService } from '../payments.service';
import { 
  CreatePaymentDto, 
  PaymentMethod, 
  PaymentStatus,
  RefundPaymentDto 
} from '../dto/payment.dto';

describe('Payments Integration Tests', () => {
  let app: INestApplication;
  let authService: AuthService;
  let paymentsService: PaymentsService;
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    authService = moduleFixture.get<AuthService>(AuthService);
    paymentsService = moduleFixture.get<PaymentsService>(PaymentsService);
    await app.init();

    // Create test user and get auth token
    const testUser = {
      email: 'test@example.com',
      password: 'Test123!@#',
    };
    const auth = await authService.register(testUser);
    authToken = auth.tokens.accessToken;
    testUserId = auth.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /payments', () => {
    it('should create payment successfully', () => {
      const paymentData: CreatePaymentDto = {
        method: PaymentMethod.CREDIT_CARD,
        amount: {
          amount: 99.99,
          currency: 'USD'
        },
        providerDetails: {
          paymentMethodId: 'pm_test_123'
        }
      };

      return request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('status', PaymentStatus.PROCESSING);
          expect(res.body.amount).toEqual(paymentData.amount);
          expect(res.body.method).toBe(paymentData.method);
        });
    });

    it('should fail with invalid amount', () => {
      const invalidData = {
        method: PaymentMethod.CREDIT_CARD,
        amount: {
          amount: -10, // Invalid negative amount
          currency: 'USD'
        }
      };

      return request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('GET /payments', () => {
    it('should get user payments successfully', async () => {
      // Create test payment first
      const payment = await paymentsService.create({
        userId: testUserId,
        method: PaymentMethod.CREDIT_CARD,
        amount: {
          amount: 99.99,
          currency: 'USD'
        }
      });

      return request(app.getHttpServer())
        .get('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('status');
          expect(res.body[0]).toHaveProperty('amount');
        });
    });

    it('should filter payments by status', async () => {
      return request(app.getHttpServer())
        .get('/payments?status=completed')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach(payment => {
            expect(payment.status).toBe(PaymentStatus.COMPLETED);
          });
        });
    });
  });

  describe('POST /payments/:id/refund', () => {
    it('should refund payment successfully', async () => {
      // Create test payment first
      const payment = await paymentsService.create({
        userId: testUserId,
        method: PaymentMethod.CREDIT_CARD,
        amount: {
          amount: 99.99,
          currency: 'USD'
        }
      });

      const refundData: RefundPaymentDto = {
        reason: 'Customer requested refund'
      };

      return request(app.getHttpServer())
        .post(`/payments/${payment.id}/refund`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(refundData)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('status', PaymentStatus.REFUNDED);
        });
    });

    it('should fail with invalid payment id', () => {
      return request(app.getHttpServer())
        .post('/payments/invalid-id/refund')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Test refund' })
        .expect(400);
    });
  });
});
