---
title: "SEAM: Smooth Execution of Action-Chunked Motion for Vision-Language-Action Policies"
authors: ["Dijia Zhan", "Xuemiao Xu", "Jinyi Li", "Jie Tang"]
venue: "arXiv"
year: 2026
addedAt: "2026-09-02T00:00:00+08:00"
status: "reading"
progress: 0
paperUrl: "https://arxiv.org/abs/2607.04609"
pdfUrl: "/papers/seam.pdf"
tags: ["Vision-Language-Action", "Action Chunking", "Motion Smoothness"]
featured: false
description: "SEAM uses training-free velocity-guided loss steering to smooth action-chunk transitions in flow-matching VLAs."
---

## Abstract

Vision-Language-Action (VLA) policies that execute fixed-length action chunks can exhibit multimodal bifurcation: a cross-chunk inconsistency in which adjacent chunks generated from independent Gaussian latents can converge to incompatible trajectory modes, producing abrupt discontinuities at chunk boundaries. Existing remedies either require backpropagation through the policy at each denoising step, rely on rejection sampling, or require retraining, each trading computational cost or task reliability for smoother transitions. We propose SEAM (Smooth Execution of Action-chunked Motion), a training-free inference-time method for flow matching VLAs. SEAM exploits a synchronous-execution insight: after the robot consumes the executed prefix, the previous chunk’s unexecuted tail is already available as an analytic consistency reference. Its core mechanism, Velocity-guided Loss Steering (VLS), derives a time-dependent target from this tail and applies a closed-form correction after each Euler step without backpropagating through the policy network. On LIBERO-10 with π0.5, SEAM reduces boundary jerk by 28%, reduces chunk transition discontinuity by 27%, preserves baseline-level task success, and keeps denoising-loop cost near the unguided baseline.
