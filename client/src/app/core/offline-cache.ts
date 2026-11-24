export async function clearOfflineData(): Promise<void> {
  if (!('caches' in window)) return;
  try {
    const keys = await caches.keys();
    const filtered = keys.filter((key) => key.startsWith('ngsw:') && key.includes(':api-read:'));
    const promises = [];
    for (const key of filtered) promises.push(caches.delete(key));
    await Promise.all(promises);
  } catch (err) {
    console.warn(err);
  }
}
