import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canAccessDashboardWidget,
  normalizeDashboardOrder,
  resolveDashboardLayoutFromSnapshot,
} from '../../src/lib/dashboard/customization';
import { DASHBOARD_WIDGETS } from '../../src/lib/dashboard/widgets';

const widgetByKey = (key: string) => {
  const widget = DASHBOARD_WIDGETS.find((item) => item.key === key);
  assert.ok(widget, `Expected widget ${key} to exist`);
  return widget;
};

test('normalizeDashboardOrder filters invalid entries and appends missing keys', () => {
  assert.deepEqual(
    normalizeDashboardOrder(
      ['invoice_vs_proforma', 'unknown', 'marketing_sales_performance', 'invoice_vs_proforma'],
      ['marketing_sales_performance', 'attendance_overview', 'invoice_vs_proforma']
    ),
    ['invoice_vs_proforma', 'marketing_sales_performance', 'attendance_overview']
  );
});

test('canAccessDashboardWidget respects scope and module access', () => {
  const user = {
    role: 'TEAM_LEADER',
    allowedModules: ['CORE', 'HR'],
  };

  assert.equal(canAccessDashboardWidget(user, 'team_summary', 'TEAM'), true);
  assert.equal(canAccessDashboardWidget(user, 'team_summary', 'INDIVIDUAL'), false);
});

test('resolveDashboardLayoutFromSnapshot applies visibility, order, and policy filters', () => {
  const accessibleWidgets = [
    widgetByKey('marketing_sales_performance'),
    widgetByKey('attendance_overview'),
    widgetByKey('team_summary'),
  ];

  const resolved = resolveDashboardLayoutFromSnapshot({
    accessibleWidgets,
    context: 'TEAM',
    user: {
      id: 'user-1',
      role: 'TEAM_LEADER',
    },
    roleDefault: {
      widgetVisibility: {
        marketing_sales_performance: false,
      },
      widgetOrder: [
        'team_summary',
        'marketing_sales_performance',
        'attendance_overview',
      ],
      widgetConfig: {
        marketing_sales_performance: {
          range: 'month',
        },
      },
    },
    userPref: {
      selectedScope: 'TEAM',
      widgetVisibility: {
        marketing_sales_performance: true,
        attendance_overview: false,
      },
      widgetOrder: [
        'attendance_overview',
        'marketing_sales_performance',
        'team_summary',
      ],
      widgetConfig: {
        attendance_overview: {
          departmentId: 'dept-1',
        },
      },
    },
    policies: [
      {
        widgetKey: 'team_summary',
        locked: false,
        allowedRoles: ['ADMIN'],
        allowedUserIds: [],
      },
    ],
  });

  assert.equal(resolved.selectedScope, 'TEAM');
  assert.equal(resolved.roleDefaultSource, 'USER');
  assert.deepEqual(
    resolved.availableWidgets.map((widget) => widget.key),
    ['marketing_sales_performance', 'attendance_overview']
  );
  assert.deepEqual(
    resolved.widgets.map((widget) => widget.key),
    ['attendance_overview', 'marketing_sales_performance']
  );
  assert.equal(resolved.widgets[0]?.visible, false);
  assert.equal(resolved.widgets[1]?.visible, true);
  assert.deepEqual(resolved.widgets[0]?.config, {
    departmentId: 'dept-1',
  });
  assert.deepEqual(resolved.widgets[1]?.config, {
    range: 'month',
  });
});
