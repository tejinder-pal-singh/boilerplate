import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { AuthService } from '../../auth/auth.service';
import { NotificationsService } from '../notifications.service';
import { NotificationType, NotificationPriority, CreateNotificationDto } from '../dto/notification.dto';

describe('Notifications Integration Tests', () => {
  let app: INestApplication;
  let authService: AuthService;
  let notificationsService: NotificationsService;
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    authService = moduleFixture.get<AuthService>(AuthService);
    notificationsService = moduleFixture.get<NotificationsService>(NotificationsService);
    await app.init();

    // Create test user and get auth token
    const testUser = {
      email: 'test@example.com',
      password: 'Test123!@#',
    };
    const auth = await authService.register(testUser);
    authToken = auth.tokens.accessToken;
    testUserId = auth.user.id;

    // Create test notifications
    const notifications: CreateNotificationDto[] = [
      {
        userId: testUserId,
        type: NotificationType.SECURITY,
        priority: NotificationPriority.HIGH,
        title: 'Security Alert',
        message: 'New login from unknown device'
      },
      {
        userId: testUserId,
        type: NotificationType.ACCOUNT,
        priority: NotificationPriority.MEDIUM,
        title: 'Profile Update',
        message: 'Your profile was updated'
      }
    ];

    await Promise.all(
      notifications.map(notification => 
        notificationsService.create(notification)
      )
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /notifications', () => {
    it('should get user notifications successfully', () => {
      return request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(2);
          expect(res.body[0]).toHaveProperty('type');
          expect(res.body[0]).toHaveProperty('title');
          expect(res.body[0]).toHaveProperty('message');
        });
    });

    it('should filter notifications by type', () => {
      return request(app.getHttpServer())
        .get('/notifications?type=security')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(1);
          expect(res.body[0].type).toBe(NotificationType.SECURITY);
        });
    });

    it('should filter notifications by read status', () => {
      return request(app.getHttpServer())
        .get('/notifications?read=false')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach(notification => {
            expect(notification.read).toBe(false);
          });
        });
    });
  });

  describe('PATCH /notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      const notifications = await notificationsService.findAll(testUserId);
      const notificationId = notifications[0].id;

      return request(app.getHttpServer())
        .patch(`/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('read', true);
        });
    });

    it('should fail with invalid notification id', () => {
      return request(app.getHttpServer())
        .patch('/notifications/invalid-id/read')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('POST /notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      await request(app.getHttpServer())
        .post('/notifications/read-all')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify all notifications are marked as read
      return request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          res.body.forEach(notification => {
            expect(notification.read).toBe(true);
          });
        });
    });
  });

  describe('DELETE /notifications/:id', () => {
    it('should delete notification', async () => {
      const notifications = await notificationsService.findAll(testUserId);
      const notificationId = notifications[0].id;

      await request(app.getHttpServer())
        .delete(`/notifications/${notificationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify notification is deleted
      return request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.find(n => n.id === notificationId)).toBeUndefined();
        });
    });

    it('should fail with invalid notification id', () => {
      return request(app.getHttpServer())
        .delete('/notifications/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('PUT /notifications/preferences', () => {
    it('should update notification preferences', () => {
      const preferences = {
        email: {
          [NotificationType.SECURITY]: true,
          [NotificationType.ACCOUNT]: true,
          [NotificationType.PAYMENT]: false,
          [NotificationType.SOCIAL]: false
        },
        push: {
          [NotificationType.SECURITY]: true,
          [NotificationType.ACCOUNT]: false,
          [NotificationType.PAYMENT]: true,
          [NotificationType.SOCIAL]: true
        }
      };

      return request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(preferences)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('email');
          expect(res.body).toHaveProperty('push');
          expect(res.body.email[NotificationType.SECURITY]).toBe(true);
          expect(res.body.push[NotificationType.ACCOUNT]).toBe(false);
        });
    });

    it('should fail with invalid preferences format', () => {
      const invalidPreferences = {
        email: {
          invalid: true
        }
      };

      return request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPreferences)
        .expect(400);
    });
  });
});
