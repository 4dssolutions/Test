<?php

namespace Espo\Custom\Jobs;

use Espo\Core\Jobs\Base;

class TwilioFollowUpJob extends Base
{
    public function run()
    {
        $entityManager = $this->getEntityManager();
        $serviceFactory = $this->getContainer()->get('serviceFactory');
        $logger = $this->getContainer()->get('logger');

        $twilioService = $serviceFactory->create('TwilioService');
        if (!$twilioService) {
            $logger->warning('Twilio service not available.');
            return;
        }

        $cutoff = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))
            ->modify('-48 hours')
            ->format('Y-m-d H:i:s');

        $invoiceRepository = $entityManager->getRepository('Invoice');
        $overdueInvoices = $invoiceRepository
            ->where([
                'status' => 'Overdue',
                'twilioFollowUpSent' => false,
                'modifiedAt<=' => $cutoff,
            ])
            ->find();

        foreach ($overdueInvoices as $invoice) {
            $accountId = $invoice->get('accountId');
            $phone = null;
            if ($accountId) {
                $account = $entityManager->getEntity('Account', $accountId);
                if ($account) {
                    $phone = $account->get('phoneNumber');
                }
            }

            if ($phone) {
                $twilioService->sendFollowUpCall($phone, 'Invoice overdue follow-up');
                $twilioService->sendSms($phone, 'Your invoice is overdue. Our team will follow up.');
                $invoice->set('twilioFollowUpSent', true);
                $entityManager->saveEntity($invoice, ['skipHooks' => true]);
            } else {
                $logger->warning('No phone available for overdue invoice ' . $invoice->id);
            }
        }

        $contractRepository = $entityManager->getRepository('Contract');
        $pendingContracts = $contractRepository
            ->where([
                'status' => 'Pending',
                'twilioFollowUpSent' => false,
                'createdAt<=' => $cutoff,
            ])
            ->find();

        foreach ($pendingContracts as $contract) {
            $accountId = $contract->get('accountId');
            $phone = null;
            if ($accountId) {
                $account = $entityManager->getEntity('Account', $accountId);
                if ($account) {
                    $phone = $account->get('phoneNumber');
                }
            }

            if ($phone) {
                $twilioService->sendFollowUpCall($phone, 'Contract signature reminder');
                $twilioService->sendSms($phone, 'Your contract is awaiting signature.');
                $contract->set('twilioFollowUpSent', true);
                $entityManager->saveEntity($contract, ['skipHooks' => true]);
            } else {
                $logger->warning('No phone available for contract ' . $contract->id);
            }
        }
    }
}
