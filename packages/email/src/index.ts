import { EventEmitter } from '@/packages/event-system';
import { z } from 'zod';

type EmailProvider = 'smtp' | 'sendgrid' | 'aws-ses' | 'mailgun' | 'postmark';
type EmailPriority = 'high' | 'normal' | 'low';
type EmailStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'bounced' | 'spam';

interface Attachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  encoding?: string;
  cid?: string;
}

interface EmailAddress {
  name?: string;
  email: string;
}

interface EmailOptions {
  from?: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  replyTo?: EmailAddress;
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  attachments?: Attachment[];
  priority?: EmailPriority;
  headers?: Record<string, string>;
  tags?: string[];
  metadata?: Record<string, any>;
  trackOpens?: boolean;
  trackClicks?: boolean;
  scheduleFor?: Date;
  retries?: number;
  maxRetries?: number;
  retryDelay?: number;
}

interface EmailTemplate {
  id: string;
  name: string;
  description?: string;
  subject: string;
  text?: string;
  html?: string;
  variables: string[];
  version?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface EmailEvent {
  id: string;
  type: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'unsubscribed';
  timestamp: Date;
  email: string;
  metadata?: Record<string, any>;
}

interface EmailStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

interface ProviderConfig {
  type: EmailProvider;
  apiKey?: string;
  apiSecret?: string;
  region?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  secure?: boolean;
}

class EmailService {
  private provider: EmailProvider;
  private config: ProviderConfig;
  private templates: Map<string, EmailTemplate> = new Map();
  private queue: Map<string, EmailOptions> = new Map();
  private events: EmailEvent[] = [];
  private eventEmitter: EventEmitter;
  private processing: boolean = false;
  private defaultFrom?: EmailAddress;
  private rateLimits: Map<EmailProvider, { limit: number; interval: number }> = new Map([
    ['sendgrid', { limit: 100, interval: 1000 }], // 100 emails per second
    ['aws-ses', { limit: 14, interval: 1000 }], // 14 emails per second
    ['mailgun', { limit: 500, interval: 1000 }], // 500 emails per second
    ['postmark', { limit: 50, interval: 1000 }], // 50 emails per second
    ['smtp', { limit: 10, interval: 1000 }], // 10 emails per second
  ]);

  constructor(config: ProviderConfig) {
    this.provider = config.type;
    this.config = config;
    this.eventEmitter = new EventEmitter();
    this.startQueue();
  }

  private startQueue(): void {
    setInterval(() => {
      this.processQueue();
    }, 1000);
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.size === 0) return;
    this.processing = true;

    const rateLimit = this.rateLimits.get(this.provider)!;
    const batchSize = Math.min(rateLimit.limit, this.queue.size);
    const batch = Array.from(this.queue.entries()).slice(0, batchSize);

    try {
      await Promise.all(
        batch.map(async ([id, options]) => {
          try {
            await this.sendEmail(options);
            this.queue.delete(id);
            this.trackEvent({
              id,
              type: 'sent',
              timestamp: new Date(),
              email: options.to[0].email,
              metadata: options.metadata,
            });
          } catch (error) {
            const retries = (options.retries || 0) + 1;
            if (retries <= (options.maxRetries || 3)) {
              options.retries = retries;
              setTimeout(() => {
                this.queue.set(id, options);
              }, (options.retryDelay || 1000) * retries);
            } else {
              this.trackEvent({
                id,
                type: 'bounced',
                timestamp: new Date(),
                email: options.to[0].email,
                metadata: { error: error.message },
              });
            }
          }
        })
      );
    } finally {
      this.processing = false;
    }
  }

  private async sendEmail(options: EmailOptions): Promise<void> {
    // Validate email options
    this.validateEmailOptions(options);

    // Apply template if specified
    if (options.templateId) {
      const template = this.templates.get(options.templateId);
      if (!template) {
        throw new Error(`Template ${options.templateId} not found`);
      }
      options = this.applyTemplate(template, options);
    }

    // Send email based on provider
    switch (this.provider) {
      case 'sendgrid':
        await this.sendWithSendgrid(options);
        break;
      case 'aws-ses':
        await this.sendWithSES(options);
        break;
      case 'mailgun':
        await this.sendWithMailgun(options);
        break;
      case 'postmark':
        await this.sendWithPostmark(options);
        break;
      case 'smtp':
        await this.sendWithSMTP(options);
        break;
    }
  }

  private validateEmailOptions(options: EmailOptions): void {
    const schema = z.object({
      from: z.object({
        name: z.string().optional(),
        email: z.string().email(),
      }).optional(),
      to: z.array(z.object({
        name: z.string().optional(),
        email: z.string().email(),
      })).min(1),
      subject: z.string().min(1),
      text: z.string().optional(),
      html: z.string().optional(),
    });

    schema.parse(options);
  }

  private applyTemplate(
    template: EmailTemplate,
    options: EmailOptions
  ): EmailOptions {
    let { html, text } = template;
    const data = options.templateData || {};

    // Replace variables in template
    template.variables.forEach(variable => {
      const value = data[variable] || '';
      const pattern = new RegExp(`{{${variable}}}`, 'g');
      if (html) html = html.replace(pattern, value);
      if (text) text = text.replace(pattern, value);
    });

    return {
      ...options,
      subject: template.subject,
      html,
      text,
    };
  }

  private async sendWithSendgrid(options: EmailOptions): Promise<void> {
    // Implementation for SendGrid
  }

  private async sendWithSES(options: EmailOptions): Promise<void> {
    // Implementation for AWS SES
  }

  private async sendWithMailgun(options: EmailOptions): Promise<void> {
    // Implementation for Mailgun
  }

  private async sendWithPostmark(options: EmailOptions): Promise<void> {
    // Implementation for Postmark
  }

  private async sendWithSMTP(options: EmailOptions): Promise<void> {
    // Implementation for SMTP
  }

  private trackEvent(event: EmailEvent): void {
    this.events.push(event);
    this.eventEmitter.emit('emailEvent', event);
  }

  // Public API
  public async send(options: EmailOptions): Promise<string> {
    const id = Math.random().toString(36).substr(2, 9);
    options.from = options.from || this.defaultFrom;

    if (options.scheduleFor && options.scheduleFor > new Date()) {
      setTimeout(() => {
        this.queue.set(id, options);
      }, options.scheduleFor.getTime() - Date.now());
    } else {
      this.queue.set(id, options);
    }

    return id;
  }

  public async createTemplate(template: Omit<EmailTemplate, 'createdAt' | 'updatedAt'>): Promise<void> {
    const now = new Date();
    this.templates.set(template.id, {
      ...template,
      createdAt: now,
      updatedAt: now,
    });
  }

  public async updateTemplate(
    id: string,
    updates: Partial<EmailTemplate>
  ): Promise<void> {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template ${id} not found`);
    }

    this.templates.set(id, {
      ...template,
      ...updates,
      updatedAt: new Date(),
    });
  }

  public async deleteTemplate(id: string): Promise<void> {
    this.templates.delete(id);
  }

  public getTemplate(id: string): EmailTemplate | undefined {
    return this.templates.get(id);
  }

  public getStats(): EmailStats {
    const stats = this.events.reduce(
      (acc, event) => {
        acc[event.type]++;
        return acc;
      },
      {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        complained: 0,
        unsubscribed: 0,
      }
    );

    const total = stats.sent || 1; // Avoid division by zero
    return {
      ...stats,
      openRate: stats.opened / total,
      clickRate: stats.clicked / total,
      bounceRate: stats.bounced / total,
    };
  }

  public on(event: string, handler: (event: EmailEvent) => void): () => void {
    return this.eventEmitter.on(event, handler).unsubscribe;
  }

  public setDefaultFrom(from: EmailAddress): void {
    this.defaultFrom = from;
  }
}

// React integration
import { createContext, useContext, useState, useEffect } from 'react';

const EmailContext = createContext<EmailService | null>(null);

export const EmailProvider: React.FC<{
  children,
  config,
}: {
  children: React.ReactNode;
  config: ProviderConfig;
}): JSX.Element {
  const [service] = useState(() => new EmailService(config));

  return (
    <EmailContext.Provider value={service}>{children}</EmailContext.Provider>
  );
}

export function useEmail() {
  const service = useContext(EmailContext);
  if (!service) {
    throw new Error('useEmail must be used within an EmailProvider');
  }

  const [stats, setStats] = useState(service.getStats());

  useEffect(() => {
    return service.on('emailEvent', () => {
      setStats(service.getStats());
    });
  }, [service]);

  return {
    send: service.send.bind(service),
    createTemplate: service.createTemplate.bind(service),
    updateTemplate: service.updateTemplate.bind(service),
    deleteTemplate: service.deleteTemplate.bind(service),
    getTemplate: service.getTemplate.bind(service),
    stats,
  };
}

export {
  EmailService,
  type EmailProvider,
  type EmailOptions,
  type EmailTemplate,
  type EmailEvent,
  type EmailStats,
  type ProviderConfig,
};

// Example usage:
// const emailService = new EmailService({
//   type: 'sendgrid',
//   apiKey: 'your-api-key',
// });
//
// // Create a template
// await emailService.createTemplate({
//   id: 'welcome',
//   name: 'Welcome Email',
//   subject: 'Welcome to {{appName}}',
//   html: '<h1>Welcome, {{name}}!</h1>',
//   variables: ['appName', 'name'],
// });
//
// // Send an email
// await emailService.send({
//   to: [{ email: 'user@example.com', name: 'User' }],
//   templateId: 'welcome',
//   templateData: {
//     appName: 'MyApp',
//     name: 'John',
//   },
//   priority: 'high',
//   trackOpens: true,
//   trackClicks: true,
// });
//
// // React usage
// function EmailDashboard() {
//   const { send, stats } = useEmail();
//
//   const sendWelcomeEmail = async () => {
//     await send({
//       to: [{ email: 'user@example.com' }],
//       subject: 'Welcome!',
//       html: '<h1>Welcome!</h1>',
//     });
//   };
//
//   return (
//     <div>
//       <button onClick={sendWelcomeEmail}>Send Welcome Email</button>
//       <div>Open Rate: {(stats.openRate * 100).toFixed(2)}%</div>
//     </div>
//   );
// }
export default ExperimentManager;
