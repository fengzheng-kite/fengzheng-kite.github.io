---
title: "Real-Time Execution of Action Chunking Flow Policies"
authors: ["Kevin Black", "Manuel Y. Galliker", "Sergey Levine"]
venue: "NeurIPS"
year: 2025
addedAt: "2026-08-31T15:43:17+08:00"
status: "reading"
progress: 0
paperUrl: "https://arxiv.org/abs/2506.07339"
tags: ["Vision-Language-Action", "Action Chunking", "Real-Time Control"]
featured: false
description: "Real-time chunking enables smooth asynchronous execution of action chunking policies under inference latency."
---

## Abstract

Modern AI systems, especially those interacting with the physical world, increasingly require real-time performance. However, the high latency of state-of-the-art generalist models, including recent vision-language action models (VLAs), poses a significant challenge. While action chunking has enabled temporal consistency in high-frequency control tasks, it does not fully address the latency problem, leading to pauses or out-of-distribution jerky movements at chunk boundaries. This paper presents a novel inference-time algorithm that enables smooth asynchronous execution of action chunking policies. Our method, real-time chunking (RTC), is applicable to any diffusion- or flow-based VLA out of the box with no re-training. It generates the next action chunk while executing the current one, "freezing" actions guaranteed to execute and "inpainting" the rest. To test RTC, we introduce a new benchmark of 12 highly dynamic tasks in the Kinetix simulator, as well as evaluate 6 challenging real-world bimanual manipulation tasks. Results demonstrate that RTC is fast, performant, and uniquely robust to inference delay, significantly improving task throughput and enabling high success rates in precise tasks—even in the presence of significant latency.
