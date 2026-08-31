---
title: "Leave No Observation Behind: Real-time Correction for VLA Action Chunks"
authors: ["Kohei Sendai", "Maxime Alvarez", "Tatsuya Matsushima", "Yutaka Matsuo", "Yusuke Iwasawa"]
venue: "arXiv"
year: 2025
addedAt: "2026-08-31T16:18:56+08:00"
status: "reading"
progress: 0
paperUrl: "https://arxiv.org/abs/2509.23224"
pdfUrl: "/papers/lnob.pdf"
tags: ["Vision-Language-Action", "Action Chunking", "Real-Time Control"]
featured: false
description: "A lightweight correction head restores real-time responsiveness to VLA action chunks under inference delay."
---

## Abstract

To improve efficiency and temporal coherence, Vision-Language-Action (VLA) models often predict action chunks; however, this action chunking harms reactivity under inference delay and long horizons. We introduce Asynchronous Action Chunk Correction (A2C2), a lightweight real-time chunk correction head that runs every control step and adds a time-aware correction to any off-the-shelf VLA’s action chunk. The module combines the latest observation, the predicted action from the VLA, a positional feature that encodes the index of the base action within the chunk, and features from the base policy, then outputs a per-step correction. This preserves the base model’s competence while restoring closed-loop responsiveness. The approach requires no retraining of the base policy and is orthogonal to asynchronous execution schemes such as Real-Time Chunking (RTC). On the dynamic Kinetix task suite and LIBERO Spatial, our method yields consistent success-rate improvements across increasing delays and execution horizons, while adding minimal overhead compared with inference of the large VLA model.
