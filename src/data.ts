export const sreMaturityData = [
  { domain: 'SLO/SLA Definition', score: 42, band: 'Developing', trend: 'Flat' },
  { domain: 'Alerting Quality', score: 58, band: 'Maturing', trend: 'Up', change: '+6pts' },
  { domain: 'Incident Management', score: 71, band: 'Advanced', trend: 'Up', change: '+12pts' },
  { domain: 'On-Call Health', score: 44, band: 'Developing', trend: 'Down', change: '-3pts' },
  { domain: 'Runbook Coverage', score: 31, band: 'Beginner', trend: 'Flat' },
  { domain: 'Chaos Engineering', score: 12, band: 'Minimal', trend: 'Flat' },
  { domain: 'Capacity Planning', score: 55, band: 'Maturing', trend: 'Up', change: '+4pts' },
  { domain: 'Toil Measurement', score: 22, band: 'Beginner', trend: 'Down', change: '-8pts' },
  { domain: 'Post-Incident Reviews', score: 67, band: 'Advanced', trend: 'Up', change: '+9pts' },
  { domain: 'Error Budget Usage', score: 18, band: 'Minimal', trend: 'Flat' },
];

export const iacSkillsData = [
  // AWS
  { id: 'SKL-AWS-001', name: 'AWS Tagging Governance', trigger: 'Missing or inconsistent tags', severity: 'HIGH' },
  { id: 'SKL-AWS-002', name: 'AWS EC2 Cost-Cognizant Sizing', trigger: 'Oversized or wrong-gen instances', severity: 'HIGH' },
  { id: 'SKL-AWS-003', name: 'AWS S3 Storage Type Selection', trigger: 'gp2, st1, sc1 misuse', severity: 'MEDIUM' },
  { id: 'SKL-AWS-004', name: 'AWS NAT Gateway Optimization', trigger: 'Multiple NATs, low-traffic NATs', severity: 'HIGH' },
  // Azure
  { id: 'SKL-AZR-001', name: 'Azure VM Right-Sizing', trigger: 'Underutilized B-series/D-series VMs', severity: 'HIGH' },
  { id: 'SKL-AZR-002', name: 'Azure Blob Storage Tiers', trigger: 'Hot tier used for archive data', severity: 'MEDIUM' },
  { id: 'SKL-AZR-003', name: 'Azure Orphaned Disks', trigger: 'Unattached managed disks', severity: 'HIGH' },
  // GCP
  { id: 'SKL-GCP-001', name: 'GCP Compute Engine CUDs', trigger: 'Missing Committed Use Discounts', severity: 'HIGH' },
  { id: 'SKL-GCP-002', name: 'GCP Cloud Storage Lifecycle', trigger: 'Missing transition to Nearline/Coldline', severity: 'MEDIUM' },
  { id: 'SKL-GCP-003', name: 'GCP Idle IP Addresses', trigger: 'Unattached static external IPs', severity: 'LOW' },
  // Nvidia
  { id: 'SKL-NVD-001', name: 'Nvidia GPU Utilization', trigger: 'Idle A100/H100 instances', severity: 'CRITICAL' },
  { id: 'SKL-NVD-002', name: 'Nvidia MIG Configuration', trigger: 'Suboptimal Multi-Instance GPU slicing', severity: 'HIGH' },
  { id: 'SKL-NVD-003', name: 'Nvidia Spot Instance Usage', trigger: 'On-demand used for interruptible training', severity: 'MEDIUM' },
  // General IaC
  { id: 'SKL-IAC-013', name: 'IaC Drift Detection', trigger: 'Resources orphaned from codebase', severity: 'HIGH' },
  { id: 'SKL-IAC-014', name: 'Environment Parity Governance', trigger: 'Prod config leaking into dev/staging', severity: 'HIGH' },
];

export const doraMetricsData = {
  deploymentFrequency: { value: '4.2/day', band: 'High', trend: '+12%' },
  leadTime: { value: '18 hrs', band: 'Medium', trend: '-5%' },
  changeFailureRate: { value: '34%', band: 'Low', trend: '+8%', warning: true },
  mttr: { value: '2.4 hrs', band: 'High', trend: '-15%' },
};

export const aiRoiData = {
  acceptanceRate: 42,
  ttfcDelta: '-18%',
  reworkRatio: '2.1x',
  costPerFeature: '$4,250',
  throughputDelta: '+14%',
};

export const remediationRoadmap = [
  { phase: 'Phase 1', focus: 'IaC Tagging & Lifecycle', tasks: ['Implement mandatory tag schema', 'Add S3/ECR lifecycle rules', 'Destroy orphaned volumes'] },
  { phase: 'Phase 2', focus: 'DORA CFR Reduction', tasks: ['Enforce CI test gates on top 8 repos', 'Review AI-generated test coverage', 'Implement PR size limits'] },
  { phase: 'Phase 3', focus: 'SRE Alerting Quality', tasks: ['Tune Datadog p99 latency alerts', 'Establish formal Error Budget policy', 'Automate runbook links in OpsGenie'] },
];

export const doraTrendData = [
  { name: 'Week 1', cfr: 15, df: 2.1 },
  { name: 'Week 2', cfr: 18, df: 2.4 },
  { name: 'Week 3', cfr: 22, df: 3.0 },
  { name: 'Week 4', cfr: 28, df: 3.8 },
  { name: 'Week 5', cfr: 34, df: 4.2 }, // AI adoption scaled here, CFR spiked
];
