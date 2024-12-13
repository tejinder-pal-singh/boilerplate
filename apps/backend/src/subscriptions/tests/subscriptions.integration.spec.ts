import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { AuthService } from '../../auth/auth.service';
import { SubscriptionsService } from '../subscriptions.service';
import { 
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  SubscriptionStatus,
  SubscriptionTier,
  SubscriptionInterval
} from '../dto/subscription.dto';

describe('Subscriptions Integration Tests', () => {
  let app: INestApplication;
  let authService: AuthService;
  let subscriptionsService: SubscriptionsService;
  let authToken: string;
  let testUserId: string;
  let testPlanId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    authService = moduleFixture.get<AuthService>(AuthService);
    subscriptionsService = moduleFixture.get<SubscriptionsService>(SubscriptionsService);
    await app.init();

    // Create test user and get auth token
    const testUser = {
      email: 'test@example.com',
      password: 'Test123!@#',
    };
    const auth = await authService.register(testUser);
    authToken = auth.tokens.accessToken;
    testUserId = auth.user.id;

    // Create test plan
    const plan = await subscriptionsService.createPlan({
      tier: SubscriptionTier.PRO,
      name: 'Pro Plan',
      description: 'Test Pro Plan',
      price: {
        amount: 29.99,
        currency: 'USD',
        interval: SubscriptionInterval.MONTHLY
      },
      features: [
        {
          name: 'Feature 1',
          description: 'Test Feature 1',
          limit: 100
        }
      ],
      trialPeriodDays: 14
    });
    testPlanId = plan.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /subscriptions/plans', () => {
    it('should get all subscription plans', () => {
      return request(app.getHttpServer())
        .get('/subscriptions/plans')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('tier');
          expect(res.body[0]).toHaveProperty('price');
          expect(res.body[0]).toHaveProperty('features');
        });
    });
  });

  describe('POST /subscriptions', () => {
    it('should create subscription successfully', () => {
      const subscriptionData: CreateSubscriptionDto = {
        planId: testPlanId,
        paymentMethodId: 'pm_test_123'
      };

      return request(app.getHttpServer())
        .post('/subscriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(subscriptionData)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('status', SubscriptionStatus.ACTIVE);
          expect(res.body).toHaveProperty('planId', testPlanId);
          expect(res.body).toHaveProperty('trialEndDate');
        });
    });

    it('should fail with invalid plan id', () => {
      const invalidData = {
        planId: 'invalid-id'
      };

      return request(app.getHttpServer())
        .post('/subscriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('GET /subscriptions', () => {
    it('should get user subscriptions', async () => {
      // Create test subscription first
      const subscription = await subscriptionsService.create({
        userId: testUserId,
        planId: testPlanId
      });

      return request(app.getHttpServer())
        .get('/subscriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('status');
          expect(res.body[0]).toHaveProperty('planId');
        });
    });

    it('should filter subscriptions by status', () => {
      return request(app.getHttpServer())
        .get('/subscriptions?status=active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach(subscription => {
            expect(subscription.status).toBe(SubscriptionStatus.ACTIVE);
          });
        });
    });
  });

  describe('PATCH /subscriptions/:id', () => {
    it('should update subscription successfully', async () => {
      const subscription = await subscriptionsService.create({
        userId: testUserId,
        planId: testPlanId
      });

      const updateData: UpdateSubscriptionDto = {
        cancelAtPeriodEnd: true
      };

      return request(app.getHttpServer())
        .patch(`/subscriptions/${subscription.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('cancelAtPeriodEnd', true);
        });
    });

    it('should fail with invalid subscription id', () => {
      return request(app.getHttpServer())
        .patch('/subscriptions/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ cancelAtPeriodEnd: true })
        .expect(400);
    });
  });

  describe('DELETE /subscriptions/:id', () => {
    it('should cancel subscription successfully', async () => {
      const subscription = await subscriptionsService.create({
        userId: testUserId,
        planId: testPlanId
      });

      return request(app.getHttpServer())
        .delete(`/subscriptions/${subscription.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('status', SubscriptionStatus.CANCELLED);
          expect(res.body).toHaveProperty('cancelledAt');
        });
    });

    it('should fail with invalid subscription id', () => {
      return request(app.getHttpServer())
        .delete('/subscriptions/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });
});
