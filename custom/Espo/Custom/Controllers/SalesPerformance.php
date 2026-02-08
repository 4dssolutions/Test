<?php

namespace Espo\Custom\Controllers;

use Espo\Core\Controllers\Base;

class SalesPerformance extends Base
{
    public function actionIndex($params, $data, $request)
    {
        $entityManager = $this->getContainer()->get('entityManager');

        $leadRepository = $entityManager->getRepository('Lead');
        $leads = $leadRepository
            ->select(['leadSource', 'status', 'assignedUserId'])
            ->find();

        $leadSourceCounts = [];
        $leadStatusCounts = [];
        $agentTotals = [];
        $agentConverted = [];

        foreach ($leads as $lead) {
            $leadSource = $lead->get('leadSource') ?: 'Unknown';
            $status = $lead->get('status') ?: 'Unknown';
            $agentId = $lead->get('assignedUserId') ?: 'unassigned';

            $leadSourceCounts[$leadSource] = ($leadSourceCounts[$leadSource] ?? 0) + 1;
            $leadStatusCounts[$status] = ($leadStatusCounts[$status] ?? 0) + 1;
            $agentTotals[$agentId] = ($agentTotals[$agentId] ?? 0) + 1;

            if (strtolower((string) $status) === 'converted') {
                $agentConverted[$agentId] = ($agentConverted[$agentId] ?? 0) + 1;
            }
        }

        $agentNames = [];
        foreach (array_keys($agentTotals) as $agentId) {
            if ($agentId === 'unassigned') {
                $agentNames[$agentId] = 'Unassigned';
                continue;
            }
            $user = $entityManager->getEntity('User', $agentId);
            $agentNames[$agentId] = $user ? $user->get('name') : 'Unknown';
        }

        $conversionRates = [];
        foreach ($agentTotals as $agentId => $total) {
            $converted = $agentConverted[$agentId] ?? 0;
            $rate = $total > 0 ? round(($converted / $total) * 100, 2) : 0.0;
            $conversionRates[] = [
                'agentId' => $agentId,
                'agent' => $agentNames[$agentId] ?? 'Unknown',
                'rate' => $rate,
                'total' => $total,
                'converted' => $converted,
            ];
        }

        return [
            'leadSource' => $leadSourceCounts,
            'leadStatus' => $leadStatusCounts,
            'conversionRates' => $conversionRates,
        ];
    }
}
