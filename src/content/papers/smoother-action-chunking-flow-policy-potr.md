---
title: "Smoother Action Chunking Flow Policy via Prior-Corrected Orthogonal Trust-Region Guidance"
authors: ["Kai Fang", "Hailong Pei", "Xuemin Chi"]
venue: "arXiv"
year: 2026
addedAt: "2026-08-31T16:18:57+08:00"
status: "reading"
progress: 0
paperUrl: "https://arxiv.org/abs/2605.24433"
pdfUrl: "/papers/potr.pdf"
tags: ["Flow Matching", "Action Chunking", "Robot Manipulation"]
featured: false
description: "POTR improves action-chunk continuity with prior-corrected guidance and an orthogonal trust-region constraint."
---

## Abstract

Flow-matching robot policies commonly use action-chunking inference for efficient closed-loop control, but chunk boundaries can introduce discontinuous action transitions. Existing Real-Time Chunking (RTC) guidance improves continuity by injecting correction signals during denoising, yet its weight schedule is weak at intermediate timesteps and its unconstrained correction direction may introduce transverse perturbations. We propose POTR, a prior-corrected orthogonal trust-region guidance method. First, we incorporate a data-prior scale into the RTC guidance weight, yielding stronger intermediate-time correction. Second, we decompose the guidance vector into components parallel and perpendicular to the denoising velocity, and constrain the perpendicular component within a trust region. On LIBERO with π0.5, POTR improves success rate and consistently reduces chunk-boundary discontinuity, acceleration, and jerk compared with RTC.
