---
title: "AnyTouch 2: General Optical Tactile Representation Learning for Dynamic Tactile Perception"
authors: ["Ruoxuan Feng", "Yuxuan Zhou", "Siyu Mei", "Dongzhan Zhou", "Pengwei Wang", "Shaowei Cui", "Bin Fang", "Guocai Yao", "Di Hu"]
venue: "ICLR"
year: 2026
status: "reading"
progress: 62
paperUrl: "https://arxiv.org/abs/2602.09617"
codeUrl: "https://github.com/GeWu-Lab/AnyTouch2"
tags: ["Tactile Perception", "Representation Learning", "Dynamics"]
featured: true
description: "Reading notes on general optical tactile representations and the role of temporal dynamics."
---

## Abstract

Real-world contact-rich manipulation demands robots to perceive temporal tactile feedback, capture subtle surface deformations, and reason about object properties as well as force dynamics. Although optical tactile sensors are uniquely capable of providing such rich information, existing tactile datasets and models remain limited. These resources primarily focus on object-level attributes (e.g., material) while largely overlooking fine-grained tactile temporal dynamics during physical interactions. We consider that advancing dynamic tactile perception requires a systematic hierarchy of dynamic perception capabilities to guide both data collection and model design. To address the lack of tactile data with rich dynamic information, we present ToucHD, a large-scale hierarchical tactile dataset spanning tactile atomic actions, real-world manipulations, and touch-force paired data. Beyond scale, ToucHD establishes a comprehensive tactile dynamic data ecosystem that explicitly supports hierarchical perception capabilities from the data perspective. Building on it, we propose AnyTouch 2, a general tactile representation learning framework for diverse optical tactile sensors that unifies object-level understanding with fine-grained, force-aware dynamic perception. The framework captures both pixel-level and action-specific deformations across frames, while explicitly modeling physical force dynamics, thereby learning multi-level dynamic perception capabilities from the model perspective. We evaluate our model on benchmarks that covers static object properties and dynamic physical attributes, as well as real-world manipulation tasks spanning multiple tiers of dynamic perception capabilities-from basic object-level understanding to force-aware dexterous manipulation. Experimental results demonstrate consistent and strong performance across sensors and tasks.
