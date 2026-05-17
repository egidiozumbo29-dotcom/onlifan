# DollyFans - Sistema Pagamenti

## Obiettivo

Sistema pagamenti completo per una piattaforma creator subscription con Stripe Connect, abbonamenti mensili, commissione piattaforma, payout creator, ledger contabile, refund, chargeback e gestione lifecycle subscription.

## Stripe Connect model

Modello consigliato: Stripe Connect Express.

```text
Fan paga abbonamento mensile
        |
        v
Stripe Checkout / Billing
        |
        v
Platform account incassa e applica application fee
        |
        v
Quota netta assegnata al creator connected account
        |
        v
Payout automatico/schedulato verso conto creator
```

## Database schema principale

### subscriptions

```text
subscriptions
- id UUID PK
- fan_id UUID FK users.id
- creator_id UUID FK creator_profiles.id
- stripe_subscription_id TEXT UNIQUE
- stripe_customer_id TEXT
- status ENUM:
  - INCOMPLETE
  - TRIALING
  - ACTIVE
  - PAST_DUE
  - PAUSED
  - CANCELED
  - UNPAID
  - EXPIRED
- current_period_start TIMESTAMP
- current_period_end TIMESTAMP
- cancel_at_period_end BOOLEAN
- canceled_at TIMESTAMP NULL
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### payments

```text
payments
- id UUID PK
- fan_id UUID FK users.id
- creator_id UUID FK creator_profiles.id
- subscription_id UUID FK subscriptions.id NULL
- stripe_payment_intent_id TEXT UNIQUE NULL
- stripe_invoice_id TEXT UNIQUE NULL
- stripe_charge_id TEXT UNIQUE NULL
- amount_cents INT
- platform_fee_cents INT
- creator_net_cents INT
- currency TEXT
- status ENUM:
  - PENDING
  - SUCCEEDED
  - FAILED
  - PARTIALLY_REFUNDED
  - REFUNDED
  - DISPUTED
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### creator_earnings

```text
creator_earnings
- id UUID PK
- creator_id UUID FK creator_profiles.id
- payment_id UUID FK payments.id
- payout_id UUID FK payouts.id NULL
- gross_cents INT
- platform_fee_cents INT
- net_cents INT
- currency TEXT
- status ENUM:
  - PENDING
  - AVAILABLE
  - PAID
  - HELD
  - REVERSED
- available_at TIMESTAMP
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### payouts

```text
payouts
- id UUID PK
- creator_id UUID FK creator_profiles.id
- stripe_payout_id TEXT UNIQUE NULL
- amount_cents INT
- currency TEXT
- status ENUM:
  - PENDING
  - SCHEDULED
  - IN_TRANSIT
  - PAID
  - FAILED
  - CANCELED
- scheduled_for TIMESTAMP NULL
- arrival_date TIMESTAMP NULL
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### ledger_entries

```text
ledger_entries
- id UUID PK
- creator_id UUID FK creator_profiles.id NULL
- payment_id UUID FK payments.id NULL
- payout_id UUID FK payouts.id NULL
- type ENUM:
  - FAN_PAYMENT
  - PLATFORM_FEE
  - CREATOR_EARNING
  - REFUND
  - CHARGEBACK
  - PAYOUT
  - ADJUSTMENT
- direction ENUM:
  - DEBIT
  - CREDIT
- amount_cents INT
- currency TEXT
- description TEXT NULL
- metadata JSONB NULL
- created_at TIMESTAMP
```

### refunds

```text
refunds
- id UUID PK
- payment_id UUID FK payments.id
- stripe_refund_id TEXT UNIQUE
- amount_cents INT
- currency TEXT
- reason TEXT NULL
- status ENUM:
  - PENDING
  - SUCCEEDED
  - FAILED
  - CANCELED
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### chargebacks

```text
chargebacks
- id UUID PK
- payment_id UUID FK payments.id
- stripe_dispute_id TEXT UNIQUE
- amount_cents INT
- currency TEXT
- reason TEXT NULL
- status ENUM:
  - NEEDS_RESPONSE
  - UNDER_REVIEW
  - WON
  - LOST
  - WARNING_CLOSED
- evidence_due_by TIMESTAMP NULL
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

## Payment lifecycle diagram

### Subscription checkout

```text
Fan clicca Subscribe
        |
        v
POST /payments/subscriptions/checkout
        |
        v
Backend verifica:
- fan autenticato
- creator ACTIVE
- creator.chargesEnabled = true
- creator.stripeAccountId presente
        |
        v
Backend crea Stripe Checkout Session mode=subscription
        |
        v
Fan paga su Stripe
        |
        v
Stripe crea Subscription + Invoice + PaymentIntent
        |
        v
Webhook invoice.payment_succeeded
        |
        v
Backend crea/aggiorna:
- subscription ACTIVE
- payment SUCCEEDED
- creator_earning PENDING
- ledger entries
        |
        v
Fan ottiene accesso ai contenuti premium
```

### PaymentIntent flow

```text
Checkout Session
        |
        v
Invoice generated
        |
        v
PaymentIntent requires payment method
        |
        v
PaymentIntent processing
        |
        +-- succeeded -> invoice.payment_succeeded
        |
        +-- failed -> invoice.payment_failed
        |
        +-- requires_action -> Stripe gestisce SCA/3DS
```

## Platform commission

Esempio con prezzo creator 10 EUR e commissione 20%:

```text
Fan payment:        1000 cents
Platform fee:        200 cents
Creator net earning: 800 cents
```

Ledger generato:

```text
CREDIT FAN_PAYMENT      1000
DEBIT  PLATFORM_FEE      200
CREDIT CREATOR_EARNING   800
```

## Subscription lifecycle management

```text
INCOMPLETE
  -> checkout creato ma pagamento non completato

ACTIVE
  -> invoice.payment_succeeded

PAST_DUE
  -> invoice.payment_failed

PAUSED
  -> subscription paused lato Stripe o policy piattaforma

CANCELED
  -> customer.subscription.deleted oppure cancel_at_period_end concluso

EXPIRED
  -> current_period_end passato senza rinnovo valido
```

## Webhook handling

Endpoint:

```text
POST /payments/stripe/webhook
```

Eventi Stripe da gestire:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.payment_succeeded
invoice.payment_failed
payment_intent.succeeded
payment_intent.payment_failed
charge.refunded
charge.dispute.created
charge.dispute.updated
charge.dispute.closed
account.updated
payout.created
payout.paid
payout.failed
```

Regole fondamentali:

- Verificare sempre firma Stripe webhook.
- Usare raw request body.
- Salvare `stripe_events.stripe_event_id` per idempotenza.
- Non concedere accesso premium dal redirect frontend.
- Concedere accesso solo dopo webhook confermato.

## Refund handling

```text
Admin/Support richiede refund
        |
        v
POST /payments/refunds
        |
        v
Backend chiama Stripe Refund API
        |
        v
Webhook charge.refunded
        |
        v
Backend crea refund
        |
        v
Payment diventa REFUNDED o PARTIALLY_REFUNDED
        |
        v
Ledger registra DEBIT REFUND
        |
        v
Creator earning viene HELD o REVERSED se non ancora pagato
```

## Chargeback tracking

```text
Stripe charge.dispute.created
        |
        v
Backend crea chargeback
        |
        v
Payment status = DISPUTED
        |
        v
Creator earning = HELD
        |
        v
Ledger registra CHARGEBACK
        |
        v
Admin dashboard mostra evidence_due_by
        |
        v
Dispute won/lost aggiorna chargeback e ledger
```

## Payout scheduling system

Strategia consigliata:

```text
Ogni giorno alle 02:00 worker payout
        |
        v
Trova creator_earnings AVAILABLE
        |
        v
Raggruppa per creator_id + currency
        |
        v
Crea payout SCHEDULED
        |
        v
Associa earnings al payout
        |
        v
Crea transfer/payout Stripe Connect
        |
        v
Webhook payout.paid / payout.failed aggiorna stato
```

Politica consigliata:

```text
creator_earning.status = PENDING per 7 giorni
Dopo 7 giorni diventa AVAILABLE
Poi payout scheduling lo trasforma in PAID/IN_TRANSIT
```

Questo riduce rischio su refund, chargeback e frodi.

## API endpoints list

### Stripe Connect

```text
POST /payments/connect/onboarding-link
GET  /payments/connect/status
```

### Subscriptions

```text
POST /payments/subscriptions/checkout
GET  /subscriptions/me
GET  /subscriptions/creators/:creatorId/status
POST /subscriptions/:subscriptionId/cancel
POST /subscriptions/:subscriptionId/resume
POST /subscriptions/:subscriptionId/pause
```

### Payments

```text
GET  /payments/:paymentId
POST /payments/stripe/webhook
```

### Creator finance

```text
GET  /payments/creator/earnings
GET  /payments/creator/ledger
```

### Refunds

```text
POST /payments/refunds
```

### Payouts

```text
POST /payments/payouts/schedule
GET  /payments/creator/payouts
```

## Implementazione nel codice

File principali:

```text
prisma/schema.prisma
src/payments/payments.controller.ts
src/payments/payments.service.ts
src/payments/dto/create-subscription-checkout.dto.ts
src/payments/dto/create-refund.dto.ts
```

## Stato integrazione Stripe

La struttura è pronta per Stripe reale, ma le chiamate effettive a Stripe API sono placeholder sicuri.

Da implementare quando inserisci le chiavi Stripe reali:

- `stripe.checkout.sessions.create`
- `stripe.accounts.create`
- `stripe.accountLinks.create`
- `stripe.refunds.create`
- webhook raw body + signature verification
- transfer/payout Connect
