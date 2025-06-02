
// Legacy file - now redirects to humanoid system
export { 
  HumanoidScale as BodyScale,
  HumanoidPositions as BodyPositions,
  HumanoidNeutralPoses as NeutralPoses,
  HumanoidAnimationMetrics as AnimationMetrics,
  HumanoidBodyMetrics as EnemyBodyMetrics,
  HumanoidBodyMetricsCalculator as EnemyBodyMetricsCalculator
} from './humanoid/HumanoidBodyMetrics';

console.log('📦 [EnemyBodyMetrics] Legacy import redirected to humanoid system');
