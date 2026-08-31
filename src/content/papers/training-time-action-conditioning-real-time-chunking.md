---
title: "Training-Time Action Conditioning for Efficient Real-Time Chunking"
authors: ["Kevin Black", "Allen Z. Ren", "Michael Equi", "Sergey Levine"]
venue: "arXiv"
year: 2025
addedAt: "2026-08-31T15:49:39+08:00"
status: "reading"
progress: 0
paperUrl: "https://arxiv.org/abs/2512.05964"
pdfUrl: "/papers/training-time-rtc.pdf"
tags: ["Vision-Language-Action", "Action Chunking", "Real-Time Control"]
featured: false
description: "Training-time action prefix conditioning removes inference-time inpainting overhead while preserving smooth real-time chunking."
---

## Abstract

Real-time chunking (RTC) enables vision-language-action models (VLAs) to generate smooth, reactive robot trajectories by asynchronously predicting action chunks and conditioning on previously committed actions via inference-time inpainting. However, this inpainting method introduces computational overhead that increases inference latency. In this work, we propose a simple alternative: simulating inference delay at training time and conditioning on action prefixes directly, eliminating any inference-time overhead. Our method requires no modifications to the model architecture or robot runtime, and can be implemented with only a few additional lines of code. In simulated experiments, we find that training-time RTC outperforms inference-time RTC at higher inference delays. In real-world experiments on box building and espresso making tasks with the π0.6 VLA, we demonstrate that training-time RTC maintains both task performance and speed parity with inference-time RTC while being computationally cheaper. Our results suggest that training-time action conditioning is a practical drop-in replacement for inference-time inpainting in real-time robot control.
