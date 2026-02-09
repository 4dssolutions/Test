<?php

namespace Espo\Custom\Hooks\Task;

use Espo\Core\Hooks\Base;
use Espo\Core\ORM\Entity;

class ProjectProgress extends Base
{
    public static $order = 10;

    public function afterSave(Entity $entity, array $options = [])
    {
        if (!empty($options['skipProjectProgress'])) {
            return;
        }

        if (
            !$entity->isAttributeChanged('status') &&
            !$entity->isAttributeChanged('projectId')
        ) {
            return;
        }

        $this->recalculateProgress($entity->get('projectId'));
    }

    public function afterRemove(Entity $entity, array $options = [])
    {
        if (!empty($options['skipProjectProgress'])) {
            return;
        }

        $this->recalculateProgress($entity->get('projectId'));
    }

    private function recalculateProgress($projectId)
    {
        if (!$projectId) {
            return;
        }

        $taskRepository = $this->getEntityManager()->getRepository('Task');

        $total = $taskRepository
            ->where(['projectId' => $projectId])
            ->count();

        $completed = $taskRepository
            ->where([
                'projectId' => $projectId,
                'status' => 'Completed',
            ])
            ->count();

        $progress = 0;
        if ($total > 0) {
            $progress = (int) round(($completed / $total) * 100);
        }

        $project = $this->getEntityManager()->getEntity('Project', $projectId);
        if (!$project) {
            return;
        }

        $project->set('progress', $progress);
        $this->getEntityManager()->saveEntity($project, ['skipHooks' => true]);
    }
}
