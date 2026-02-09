<?php

namespace Espo\Custom\Services;

use Espo\Core\Services\Base;

class StripeService extends Base
{
    public function syncInvoice(array $payload)
    {
        $stripeId = $payload['id'] ?? null;
        if (!$stripeId) {
            $this->getContainer()->get('logger')->warning('Stripe invoice payload missing id.');
            return null;
        }

        $repository = $this->getEntityManager()->getRepository('Invoice');
        $invoice = $repository->where(['stripeInvoiceId' => $stripeId])->findOne();
        if (!$invoice) {
            $invoice = $this->getEntityManager()->getEntity('Invoice');
        }

        $invoice->set('stripeInvoiceId', $stripeId);
        if (!empty($payload['subscription'])) {
            $invoice->set('stripeSubscriptionId', $payload['subscription']);
        }

        if ($invoice->hasAttribute('status') && !empty($payload['status'])) {
            $invoice->set('status', ucfirst($payload['status']));
        }

        if ($invoice->hasAttribute('name') && !empty($payload['number'])) {
            $invoice->set('name', 'Invoice ' . $payload['number']);
        }

        if ($invoice->hasAttribute('dueDate') && !empty($payload['due_date'])) {
            $invoice->set('dueDate', gmdate('Y-m-d', $payload['due_date']));
        }

        $this->getEntityManager()->saveEntity($invoice, ['skipHooks' => true]);

        return $invoice;
    }

    public function syncSubscription(array $payload)
    {
        $subscriptionId = $payload['id'] ?? null;
        if (!$subscriptionId) {
            $this->getContainer()->get('logger')->warning('Stripe subscription payload missing id.');
            return null;
        }

        $logger = $this->getContainer()->get('logger');
        $logger->info('Stripe subscription synced: ' . $subscriptionId);

        return [
            'stripeSubscriptionId' => $subscriptionId,
            'status' => $payload['status'] ?? null,
        ];
    }
}
