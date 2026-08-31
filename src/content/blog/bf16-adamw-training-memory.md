---
title: "从 BF16 到 AdamW：大模型训练显存详解"
description: "理解模型权重、梯度、优化器状态与 Activation 如何共同决定训练显存。"
publishedAt: 2026-08-31
tags: ["LLM", "Training", "Memory"]
featured: true
draft: false
---

这个式子本质上是在计算：模型参数本身占多少显存或内存。

## 为什么 7B × 2 Byte ≈ 14 GB

7B 里的 B 是 billion，也就是十亿。因此：

$$
7B = 7 \times 10^9
$$

意思是这个模型大约有 70 亿个参数。

如果每个参数使用 BF16 保存，那么每个参数占：

$$
16\text{ bit} = 2\text{ Byte}
$$

因此：

$$
7 \times 10^9 \times 2\text{ Byte}
= 14 \times 10^9\text{ Byte}
\approx 14\text{ GB}
$$

所以，一个 7B 模型仅存储一份 BF16 参数，大约需要 14GB。这里说的只是模型权重本身，还没有计算训练时的梯度、优化器状态和 Activation 等内容。

## BF16 是什么

BF16 全称为 **Brain Floating Point 16**，是一种 16 位浮点数格式。

| 数据类型 | 每个数大小 | 特点 |
| --- | ---: | --- |
| FP32 | 4 Byte | 精度高，显存占用大 |
| FP16 | 2 Byte | 显存占用小，但数值范围较小 |
| BF16 | 2 Byte | 显存占用小，数值范围接近 FP32 |
| FP8 | 1 Byte | 更省显存，但训练要求更高 |

对于一个 7B 模型，使用 FP32 时：

$$
7B \times 4\text{ Byte} = 28\text{ GB}
$$

使用 BF16 时：

$$
7B \times 2\text{ Byte} = 14\text{ GB}
$$

因此，现在的大模型训练经常使用 BF16。A100、H100、H200、B200 等 GPU 都对 BF16 有较好的支持。

## AdamW 是什么

AdamW 是一种优化器。训练神经网络的核心过程可以概括为：

$$
\text{参数} \rightarrow \text{计算 Loss} \rightarrow \text{计算梯度} \rightarrow \text{更新参数}
$$

例如，某个参数当前是：

$$
w = 0.52
$$

反向传播得到梯度：

$$
g = 0.01
$$

最简单的 SGD 更新方式可能是：

$$
w_{new} = w - \eta g
$$

AdamW 比 SGD 更复杂。它会为每一个可训练参数额外保存两个状态：

$$
m = \text{梯度的一阶动量}
$$

以及：

$$
v = \text{梯度平方的二阶动量}
$$

可以粗略理解为：

- $m$：最近梯度主要朝哪个方向变化
- $v$：最近梯度变化有多剧烈

AdamW 利用这些状态，自适应地决定不同参数应该以多快的速度更新。

## 为什么 AdamW 很占内存

这也是训练 7B 模型时，不能简单认为“14GB 显存就够了”的原因。

全参数训练时，大致需要同时保存：

- 模型参数 Weight
- 梯度 Gradient
- Adam 一阶状态 $m$
- Adam 二阶状态 $v$

假设采用以下精度：

| 内容 | 每个参数占用 |
| --- | ---: |
| BF16 权重 | 2 Byte |
| BF16 梯度 | 2 Byte |
| FP32 Adam $m$ | 4 Byte |
| FP32 Adam $v$ | 4 Byte |

那么每个参数至少需要：

$$
2 + 2 + 4 + 4 = 12\text{ Byte}
$$

对于 7B 模型：

$$
7 \times 10^9 \times 12\text{ Byte} = 84\text{ GB}
$$

所以，仅参数、梯度和 AdamW 状态就可能接近：

$$
\boxed{84\text{ GB}}
$$

这还没有计算 Activation。

## 为什么 AdamW 状态经常使用 FP32

模型使用 BF16，并不意味着优化器的所有状态也使用 BF16。训练过程中，优化器状态通常需要更高的数值稳定性。

例如，一个参数值可能是：

```text
0.0000012837
```

如果所有计算都使用较低精度，某些很小的更新可能因为精度不足而丢失。因此，常见的训练方式是：

- 模型前向和反向主要使用 BF16
- 优化器的关键状态使用 FP32

这种训练方式通常称为 **Mixed Precision（混合精度训练）**。

## 有时每个参数不止 12 Byte

一些训练框架还会额外维护一份 FP32 Master Weight：

| 内容 | 每个参数占用 |
| --- | ---: |
| BF16 权重 | 2 Byte |
| BF16 梯度 | 2 Byte |
| FP32 Master Weight | 4 Byte |
| Adam $m$ | 4 Byte |
| Adam $v$ | 4 Byte |
| 合计 | 16 Byte |

那么 7B 模型需要：

$$
7B \times 16\text{ Byte} = 112\text{ GB}
$$

也就是说：

$$
\boxed{\text{7B 模型训练参数相关内存可能达到约 }84\text{--}112\text{ GB}}
$$

这也是为什么 7B 模型推理可能只需要十几 GB，训练却可能需要上百 GB。

## Activation 也会占用大量显存

训练过程中，每一层都会产生中间结果：

```text
输入
↓
Attention
↓
Hidden States
↓
MLP
↓
Hidden States
↓
下一层
```

反向传播需要使用这些中间结果，因此其中很多内容不能立即删除。这些中间结果统称为 Activation，即激活值。

Activation 大小主要受到以下因素影响：

$$
\text{Batch Size} \times
\text{Sequence Length} \times
\text{Hidden Dimension} \times
\text{Layers}
$$

所以，模型权重只有 14GB，而实际训练使用 100GB 甚至 150GB 以上显存，并不奇怪。

## 一个简单的记忆方式

一次大模型训练需要的资源可以理解成四部分：

$$
\boxed{
\text{训练显存}
= \text{模型参数}
+ \text{梯度}
+ \text{Optimizer}
+ \text{Activation}
}
$$

对于 7B + BF16 + AdamW，可以非常粗略地估算为：

| 内容 | 计算 | 占用 |
| --- | --- | ---: |
| 模型参数 | $7B \times 2\text{ Byte}$ | 14GB |
| 梯度 | $7B \times 2\text{ Byte}$ | 14GB |
| Adam $m$ | $7B \times 4\text{ Byte}$ | 28GB |
| Adam $v$ | $7B \times 4\text{ Byte}$ | 28GB |

总计：

$$
14 + 14 + 28 + 28 = \boxed{84\text{ GB}}
$$

再加上 Activation、CUDA 临时 Buffer 和其他开销，实际显存占用很容易超过 100GB。

## LoRA 为什么节省资源

全参数训练时，70 亿个参数全部需要保存梯度、Adam 一阶状态和 Adam 二阶状态。

如果 LoRA 只训练约 3000 万个参数，那么原始 70 亿参数只需要读取而不需要更新。只有 LoRA 参数需要保存：

- Gradient
- Adam $m$
- Adam $v$

因此，梯度和 AdamW 状态所占用的资源会明显减少。

最关键的一句话是：

$$
\boxed{
\text{BF16 决定一个数占多大，AdamW 决定训练一个参数还要额外保存多少内容}
}
$$

理解这两个概念之后，再看 LoRA、ZeRO、FSDP、Gradient Checkpointing 和 CPU Offload，就会容易很多。
