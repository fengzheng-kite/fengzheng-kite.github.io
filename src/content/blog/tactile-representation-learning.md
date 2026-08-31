---
title: "A working map of tactile representation learning"
description: "Organizing the questions, modalities, and evaluation choices that shape tactile foundation models."
publishedAt: 2026-08-18
tags: ["Tactile", "Embodied AI"]
featured: true
draft: false
---

Tactile learning is often described by borrowing vocabulary from vision, but touch has a different relationship with action. A tactile observation is local, contact-dependent, and shaped by how an agent chooses to interact.

## The representation question

A useful tactile representation should preserve properties relevant to downstream behavior: geometry, material, force, slip, and temporal change. The difficult part is deciding which invariances help and which erase information an agent needs.

## Three axes for reading

I currently organize papers along three axes:

1. **Sensor diversity** — whether the method transfers across optical tactile sensors.
2. **Temporal structure** — whether motion and contact evolution are modeled explicitly.
3. **Task transfer** — whether representations help control and manipulation, not only classification.

## An open question

Large-scale pretraining makes tactile models more general, but dataset scale alone may not produce action-relevant concepts. I am interested in how learning objectives can connect local contact observations to the state changes they cause.
