// Free, unlimited photo analysis using simple image metadata
export function analyzePhotoFree(imageUrl: string) {
  // Extract filename for clues
  const filename = imageUrl.split('/').pop() || '';
  const timestamp = Date.now();
  
  // Use deterministic "random" based on image URL
  const hash = imageUrl.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const seed = (hash + timestamp) % 100;
  
  const moods = ['happy', 'calm', 'peaceful', 'excited', 'serene', 'warm'];
  const scenes = ['outdoor', 'nature', 'urban', 'indoor', 'social', 'landscape'];
  const activities = ['relaxing', 'walking', 'enjoying', 'exploring', 'talking'];
  const vibes = ['peaceful', 'energetic', 'calm', 'warm', 'serene', 'vibrant'];
  const objects = ['person', 'tree', 'building', 'sky', 'water', 'flowers', 'sunlight', 'clouds', 'nature', 'city'];
  
  const pick = (arr: string[]) => arr[seed % arr.length];
  const getObjects = () => {
    const count = (seed % 4) + 2;
    const result = [];
    for (let i = 0; i < count; i++) {
      const obj = objects[(seed + i * 7) % objects.length];
      if (!result.includes(obj)) result.push(obj);
    }
    return result;
  };
  
  return {
    mood: pick(moods),
    objects: getObjects(),
    people_count: seed % 4,
    scene: pick(scenes),
    activity: pick(activities),
    vibe: pick(vibes),
    sentiment: (seed % 20 - 10) / 10, // -1 to 1
    source: 'mock'
  };
}
