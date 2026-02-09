<?php

namespace Espo\Custom\Controllers;

use Espo\Core\Controllers\Base;
use Espo\Core\Exceptions\Forbidden;

class DashboardTemplateSeed extends Base
{
    protected function checkAccess(): bool
    {
        if ($this->user && method_exists($this->user, 'isAdmin')) {
            return $this->user->isAdmin();
        }

        return false;
    }

    /**
     * Create the default Refined Digital dashboard templates.
     *
     * @return array<string,mixed>
     */
    public function actionSeed()
    {
        if (!$this->checkAccess()) {
            throw new Forbidden();
        }

        $manager = $this->getContainer()->get('serviceFactory')->create('DashboardTemplateManager');

        $owner = $manager->getOwnerTemplate();
        $employee = $manager->getEmployeeTemplate();

        return [
            'success' => true,
            'ownerTemplateId' => $owner->id,
            'employeeTemplateId' => $employee->id,
        ];
    }
}
