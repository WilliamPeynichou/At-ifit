import api from '../api';

const pickNutritionProfile = (profile = {}) => ({
  gutTolerance: profile.gutTolerance || undefined,
  sweatSodiumProfile: profile.sweatSodiumProfile || undefined,
});

export async function previewEffortStrategy(input, nutritionProfile = {}) {
  const res = await api.post('/nutrition/effort/preview', {
    ...input,
    nutritionProfile: pickNutritionProfile(nutritionProfile),
  });
  return res.data?.data ?? res.data;
}
