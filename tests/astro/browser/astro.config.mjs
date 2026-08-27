if (!process.env.OACI_ASTRO_INTEGRATION_PATH) throw new Error('OACI_ASTRO_INTEGRATION_PATH is required.');
const { default: contentIntegrity } = await import(/* @vite-ignore */ process.env.OACI_ASTRO_INTEGRATION_PATH);

export default { integrations: [contentIntegrity()], devToolbar: { enabled: true } };
