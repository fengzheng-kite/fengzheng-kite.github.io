---
title: "Tabero: Learning Gentle Manipulation with Closed-Loop Force Feedback from Vision, Touch, and Language"
authors: ["Qiwei Wu", "Rui Zhang", "Xin Xiang", "Tao Li", "Weihua Zhang", "Junjie Lai", "Renjing Xu"]
venue: "ICML"
year: 2026
addedAt: "2026-08-31T14:13:40+08:00"
status: "reading"
progress: 35
paperUrl: "https://arxiv.org/abs/2605.27886"
codeUrl: "https://github.com/NathanWu7/Tabero"
tags: ["Tactile", "Foundation Models", "Benchmark"]
featured: true
description: "A benchmark and model suite for gentle, language-conditioned robotic manipulation with tactile feedback."
---

## Abstract

Tactile sensing is essential for robots to achieve human-like gentle manipulation. However, existing Vision-Language-Action (VLA) models struggle to exploit tactile feedback for gentle manipulation due to scarce aligned vision-tactile-language data and the lack of effective closed-loop force feedback mechanisms. To address these challenges, we introduce Tabero, a benchmark and model suite for gentle, language-conditioned robotic manipulation that demands fine-grained contact force perception. First, the Tabero benchmark addresses the scarcity of tactile data by presenting a data-efficient pipeline that repurposes open-source robot manipulation trajectories to generate diverse vision-tactile-language tasks, and establishes a multidimensional evaluation protocol that measures task success alongside physical interaction quality. Second, we propose Tabero-VTLA, an architecture with a decoupled force-position command interface; the resulting force-position commands are executed by a fixed hybrid controller to enable real-time, force-aware manipulation. Evaluated on Tabero, our model maintains high task success while reducing average grip force by over 70% under gentle instructions, demonstrating its ability to modulate interaction forces based on multimodal experience. Our code is publicly available.
