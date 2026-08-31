---
title: "VLASH: Real-Time VLAs via Future-State-Aware Asynchronous Inference"
authors: ["Jiaming Tang", "Yufei Sun", "Yilong Zhao", "Shang Yang", "Yujun Lin", "Zhuoyang Zhang", "James Hou", "Yao Lu", "Zhijian Liu", "Song Han"]
venue: "arXiv"
year: 2025
addedAt: "2026-08-31T16:18:58+08:00"
status: "reading"
progress: 0
paperUrl: "https://arxiv.org/abs/2512.01031"
pdfUrl: "/papers/vlash.pdf"
codeUrl: "https://github.com/mit-han-lab/vlash"
tags: ["Vision-Language-Action", "Asynchronous Inference", "Real-Time Control"]
featured: false
description: "VLASH uses future-state-aware asynchronous inference to deliver smooth, accurate, and fast VLA control."
---

## Abstract

Vision-Language-Action models (VLAs) are becoming increasingly capable across diverse robotic tasks. However, these models are typically deployed under synchronous inference, where the robot waits for model inference to complete before acting and cannot perceive or respond to environmental changes during execution. Asynchronous inference offers a promising solution for continuous, low-latency control, but temporal misalignment between prediction and execution intervals leads to action instability. We propose VLASH, a simple yet effective method that leverages the future execution-time state by rolling the robot state forward with the previous action chunk, thereby bridging the gap between prediction and execution. VLASH delivers smooth, accurate, and fast reaction control without architectural changes or additional runtime overhead. Experiments show reduced reaction latency and improved accuracy over asynchronous baselines, enabling high-precision dynamic tasks such as playing ping-pong and whack-a-mole.
