/**
 * Web Monitoring Cron Script
 * This script pings the check API to trigger auto-checks for all active monitors.
 * 
 * Usage: npx tsx scripts/ping-monitors.js [APP_URL] [CRON_SECRET]
 * e.g.: npx tsx scripts/ping-monitors.js http://localhost:3000
 */

async function main() {
    const appUrl = process.argv[2] || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const checkEndpoint = `${appUrl.replace(/\/$/, '')}/api/it/monitoring/check`;

    console.log(`[${new Date().toISOString()}] Triggering monitor checks at: ${checkEndpoint}`);

    try {
        const response = await fetch(checkEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Add an internal secret if you implement it in the route for security
            }
        });

        const data = await response.json();
        if (response.ok) {
            console.log(`[SUCCESS] Checked ${data.checked || 0} monitors.`);
        } else {
            console.error(`[ERROR] ${response.status}: ${JSON.stringify(data)}`);
            process.exit(1);
        }
    } catch (err) {
        console.error(`[FAILED] Could not connect to API: ${err.message}`);
        process.exit(1);
    }
}

main();
