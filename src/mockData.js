const now = Date.now();
const day = 86400000;

function bars(upBase = 99) {
  return Array.from({ length: 90 }, (_, i) => {
    const date = new Date(now - (89 - i) * day).toISOString().slice(0, 10);
    const roll = Math.random() * 100;
    const uptime = roll > 2 ? upBase + Math.random() * (100 - upBase) : Math.random() * 60;
    const u = +uptime.toFixed(2);
    const status = u >= 95 ? 'up' : u >= 50 ? 'degraded' : 'down';
    return { date, uptime: u, status, checks: Math.floor(Math.random() * 20) + 5 };
  });
}

export const MOCK_STATUS = {
  config: {
    siteName: 'Status Demo',
    siteDesc: 'Demo — real-time service monitoring',
    refreshInterval: 5,
    dataRetentionDays: 90,
  },
  services: [
    {
      id: 1, name: 'Main Website', type: 'https', host: 'https://example.com',
      currentStatus: 'up', latestResponseTime: 42, hideHost: true,
      bars: bars(98),
    },
    {
      id: 2, name: 'API Server', type: 'https', host: 'https://api.example.com',
      currentStatus: 'up', latestResponseTime: 87, hideHost: true,
      bars: bars(99.5),
    },
    {
      id: 3, name: 'Database', type: 'tcp', host: 'db.internal:5432',
      currentStatus: 'up', latestResponseTime: 5, hideHost: true,
      bars: bars(99.9),
    },
    {
      id: 4, name: 'CDN Edge', type: 'https', host: 'https://cdn.example.com',
      currentStatus: 'degraded', latestResponseTime: 320, hideHost: true,
      bars: bars(95),
    },
    {
      id: 5, name: 'Mail Service', type: 'tcp', host: 'mail.internal:587',
      currentStatus: 'up', latestResponseTime: 18, hideHost: true,
      bars: bars(97),
    },
  ],
};

export const MOCK_INCIDENTS = [
  {
    id: 1,
    title: 'CDN Edge Latency Degradation',
    message: 'We are investigating elevated response times on the CDN edge nodes.',
    status: 'monitoring',
    created_at: new Date(now - 2 * day).toISOString(),
    affected_services: '[4]',
    updates: [
      {
        id: 2,
        status: 'monitoring',
        message: 'A fix has been deployed. We are monitoring the situation.',
        created_at: new Date(now - 1 * day - 3600000).toISOString(),
      },
      {
        id: 1,
        status: 'identified',
        message: 'Root cause identified: misconfigured routing rules on edge node cluster B.',
        created_at: new Date(now - 1 * day - 7200000).toISOString(),
      },
    ],
  },
  {
    id: 2,
    title: 'API Server Outage',
    message: 'The API server was unreachable due to a hardware failure in datacenter A.',
    status: 'resolved',
    created_at: new Date(now - 10 * day).toISOString(),
    affected_services: '[2]',
    updates: [
      {
        id: 4,
        status: 'resolved',
        message: 'Service fully restored. Failover complete.',
        created_at: new Date(now - 10 * day + 2 * 3600000).toISOString(),
      },
      {
        id: 3,
        status: 'identified',
        message: 'Hardware failure confirmed. Failover to backup node in progress.',
        created_at: new Date(now - 10 * day + 3600000).toISOString(),
      },
    ],
  },
];
