---
title: "从 Tensor 到训练循环：PyTorch 核心概念详解"
description: "系统理解 Tensor、Autograd、nn.Module、训练循环、显存、LoRA、分布式训练，以及 PyTorch 与 JAX 的对应关系。"
publishedAt: 2026-09-14
tags: ["PyTorch", "深度学习", "VLA"]
featured: true
draft: false
---

## 一、PyTorch 最核心的东西：Tensor

如果只记住一个概念，就是：

`torch.Tensor`

Tensor 中文一般叫张量。

实际上它就是 NumPy ndarray 的加强版。

比如：

```python
import torch

x = torch.tensor([
    [1.0, 2.0, 3.0],
    [4.0, 5.0, 6.0]
])
```

那么：

```python
x.shape
```

得到：

```text
torch.Size([2, 3])
```

即：

$$ x\in\mathbb R^{2\times3} $$

可以理解为：

2 行
3 列

在深度学习里，几乎所有东西最后都会变成 Tensor。

比如 VLA：

| 数据 | Tensor | Shape |
| --- | --- | --- |
| 图片 | `image` | `[B, C, H, W]` |
| 机器人状态 | `state` | `[B, D_state]` |
| 文本 token | `input_ids` | `[B, T]` |
| 动作 chunk | `action` | `[B, H_action, D_action]` |

其中：

- `B` = batch size
- `C` = channel
- `H/W` = 图像尺寸
- `T` = token 数量
- `D` = 特征维度

比如你之前问的 π0.5 action：

`[B, 50, 32]`

本质就是一个三维 Tensor。

## 二、Tensor 为什么比 NumPy 强？

NumPy 也可以：

```python
import numpy as np
x = np.array(...)
```

但是 NumPy 最大的问题是：

它本身不是为训练神经网络设计的。

PyTorch Tensor 主要多了两个非常关键的东西：

- GPU
- 自动求导

比如：

```python
x = torch.randn(10000, 10000)
```

默认在：

CPU

你可以：

```python
x = x.cuda()
```

变成：

GPU Tensor

然后：

```python
y = x @ x
```

矩阵乘法就由 GPU 执行。

所以很多时候：

> PyTorch ≈ NumPy + GPU + 自动求导 + 神经网络工具链
## 三、Tensor 的四个属性一定要懂

看别人代码时，你经常需要检查：

```python
x.shape
x.dtype
x.device
x.requires_grad
```

比如：

```python
print(x.shape)
print(x.dtype)
print(x.device)
print(x.requires_grad)
```

可能是：

```text
torch.Size([32, 50, 32])
torch.float32
cuda:0
False
```

分别表示：

| 属性 | 含义 |
| --- | --- |
| `shape` | 张量尺寸 |
| `dtype` | 数据类型 |
| `device` | CPU / GPU |
| `requires_grad` | 是否需要计算梯度 |

VLA 调代码的时候，这几个东西非常关键。

尤其是：

shape

绝大多数深度学习 bug，本质都是：

Tensor shape 对不上。

比如模型期待：

`[B, T, D]`

你却输入：

`[B, D, T]`

直接出问题。

## 四、PyTorch 最重要的能力：Autograd

这是真正让它成为深度学习框架的东西。

假设：

$$ y=x^2 $$

数学上：

$$ \frac{dy}{dx}=2x $$

如果：

$$ x=3 $$

那么：

$$ \frac{dy}{dx}=6 $$

PyTorch 可以自动算：

```python
x = torch.tensor(3.0, requires_grad=True)
y = x ** 2
y.backward()
print(x.grad)
```

得到：

```text
tensor(6.)
```

你根本没有自己写：

`2 * x`

PyTorch 自动帮你算了。

## 五、它怎么知道怎么求导？

这是 PyTorch 的核心思想之一：

动态计算图

执行：

```python
y = x ** 2
z = y * 3
loss = z + 5
```

PyTorch 会在背后记录：

```text
x
│
square
│
y
│
×3
│
z
│
+5
│
loss
```

也就是：

$$ loss=3x^2+5 $$

然后：

`loss.backward()`

PyTorch 从后往前走。

根据链式法则：

$$ \frac{\partial loss}{\partial x} = \frac{\partial loss}{\partial z} \frac{\partial z}{\partial y} \frac{\partial y}{\partial x} $$

最终自动得到梯度。

PyTorch 官方把 Autograd 描述为一种反向模式自动微分系统，前向计算过程中记录运算形成计算图，随后沿图反向利用链式法则计算梯度。

这就是：

loss.backward()

真正发生的事情。

## 六、这和“训练神经网络”有什么关系？

假设模型：

$$ \hat y=wx+b $$

其中：

`w` 和 `b`

是需要学习的参数。

我们希望：

$$ \hat y\approx y $$

于是定义：

$$ Loss=(\hat y-y)^2 $$

训练实际上就是算：

$$ \frac{\partial Loss}{\partial w} $$

和：

$$ \frac{\partial Loss}{\partial b} $$

然后：

$$
w\leftarrow w-\eta \frac{\partial Loss}{\partial w}
$$

$$
b\leftarrow b-\eta \frac{\partial Loss}{\partial b}
$$

这里：

$$ \eta $$

就是 learning rate。

PyTorch 帮你把这些事情全部自动化了。

## 七、nn.Module 是什么？

这是第二个必须彻底理解的东西：

`torch.nn.Module`

所有 PyTorch 神经网络基本都继承它。

例如：

```python
import torch.nn as nn

class MyModel(nn.Module):

    def __init__(self):
        super().__init__()

        self.fc1 = nn.Linear(10, 64)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(64, 3)

    def forward(self, x):
        x = self.fc1(x)
        x = self.relu(x)
        x = self.fc2(x)

        return x
```

这就是一个完整的神经网络。

官方文档也是这么定义的：PyTorch 神经网络及其组成层都以 nn.Module 为基础，通过 Module 嵌套来构成复杂模型。

## 八、__init__() 和 forward() 分别是什么？

这一点非常重要。

`__init__`

定义：

模型有什么。

例如：

```python
self.fc1 = nn.Linear(10, 64)
```

表示：

$$ 10\rightarrow64 $$

一个线性层。

然后：

```python
self.fc2 = nn.Linear(64, 3)
```

表示：

$$ 64\rightarrow3 $$
`forward()`

定义：

数据怎么走。

例如：

```text
x
↓
fc1
↓
ReLU
↓
fc2
↓
output
```

所以：

```python
def forward(self, x):
```

实际上就是模型的数据流。

## 九、为什么直接写 model(x)？

你一般不会写：

`model.forward(x)`

而是：

```python
output = model(x)
```

PyTorch 的 nn.Module 会自动调用 forward()。

所以：

`model(x)`

本质上最终执行的是：

`forward(x)`

但 Module 在外面还包了一些 hook、autograd 等机制，所以推荐使用：

`model(x)`
## 十、Parameter 是什么？

模型里面不是所有 Tensor 都需要训练。

例如：

`nn.Linear(10, 64)`

里面有：

`weight` 和 `bias`

它们属于：

`nn.Parameter`

Parameter 本质也是 Tensor，但是它告诉 PyTorch：

这是模型需要学习的参数。

官方文档说明，Parameter 是 Tensor 的子类；当它被作为 nn.Module 的属性时，会自动注册到这个 Module 的参数列表中。

例如：

```python
for name, param in model.named_parameters():
    print(name, param.shape)
```

可能输出：

```text
fc1.weight torch.Size([64, 10])
fc1.bias   torch.Size([64])

fc2.weight torch.Size([3, 64])
fc2.bias   torch.Size([3])
```

所以：

`model.parameters()`

就是：

把所有要训练的参数拿出来。

## 十一、Optimizer 是什么？

Autograd 只负责：

算梯度。

但是谁真正改参数？

答案：

`torch.optim`

例如：

```python
optimizer = torch.optim.AdamW(
    model.parameters(),
    lr=1e-4
)
```

意思：

我要使用 AdamW
训练 model.parameters()
learning rate = 0.0001

现在大模型、Transformer、VLM、VLA 非常常见的就是：

AdamW
## 十二、最经典的 PyTorch 训练循环

这一小段几乎是整个 PyTorch 的灵魂：

```python
for x, y in dataloader:

    optimizer.zero_grad()

    pred = model(x)

    loss = loss_fn(pred, y)

    loss.backward()

    optimizer.step()
```

你一定要真正理解这五行。

它们分别是：

```text
optimizer.zero_grad()
        ↓
清除上一轮梯度

pred = model(x)
        ↓
forward 前向传播

loss = loss_fn(pred, y)
        ↓
计算误差

loss.backward()
        ↓
反向传播，求梯度

optimizer.step()
        ↓
根据梯度更新参数
```

这五步几乎可以概括绝大多数深度学习训练。

## 十三、为什么要 zero_grad()？

这是很多初学者最容易忽略的地方。

PyTorch 默认：

梯度会累加。

例如第一次：

`w.grad = 0.2`

第二次 backward：

`w.grad = 0.3`

如果不清零：

`w.grad = 0.5`

而不是：

`0.3`

所以正常训练：

`optimizer.zero_grad()`

再：

`loss.backward()`

不过有时候我们故意不清零。

那就是：

**Gradient Accumulation（梯度累积）**

比如 GPU 显存只能 batch=4：

```text
batch=4 × accumulate 8 次 ≈ effective batch size=32
```

这在大模型/VLA 训练特别常见。

## 十四、Loss 是什么？

Loss 就是：

告诉模型它错得有多严重。

比如回归：

`nn.MSELoss()`

对应：

$$ L=\frac1N\sum(\hat y-y)^2 $$

分类：

`nn.CrossEntropyLoss()`

VLA 里情况更复杂。

例如不同模型可能用：

- action MSE
- L1 loss
- cross entropy
- diffusion noise prediction loss
- flow matching loss

比如 π0 / π0.5 这种 flow-matching policy，训练目标不是普通分类，而是在 action trajectory 上学习一个 velocity field。

但从 PyTorch / JAX 框架视角看，本质依然是：

```text
model
 ↓
prediction
 ↓
loss
 ↓
gradient
 ↓
optimizer
```

这个逻辑没有变。

## 十五、Dataset 和 DataLoader

模型不能一次把整个数据集全塞 GPU。

所以 PyTorch 有：

`Dataset`

和：

`DataLoader`

官方对两者的区分非常清楚：Dataset 负责保存/提供样本，而 DataLoader 在 Dataset 外面提供可迭代的数据加载机制。

你可以理解成：

- `Dataset` = 仓库
- `DataLoader` = 搬运工

例如你有：

10000 张图片

Dataset 负责：

- 第 0 张是什么
- 第 1 张是什么
- ……

DataLoader 负责：

- 每次取 32 张
- 打乱顺序
- 多进程读取
- 组成 batch

例如：

```python
loader = DataLoader(
    dataset,
    batch_size=32,
    shuffle=True,
    num_workers=8
)
```
## 十六、VLA 里面 Dataset 更复杂

你的一个 sample 可能不是：

image + label

而是：

- `observation.images`
- `observation.state`
- language instruction
- action chunk
- attention mask
- timestamp

例如：

```python
sample = {
    "image": image,
    "state": state,
    "language": language,
    "actions": actions,
}
```

经过 DataLoader：

```text
sample 1
sample 2
sample 3
...
```

会组成：

batch

所以：

```text
image: [C, H, W] → batch 后: [B, C, H, W]
action: [H, D]    → batch 后: [B, H, D]
```

这就是为什么看 VLA 源码时，Tensor shape 极其重要。

## 十七、CPU 和 GPU

这是 PyTorch 里另一个核心概念：

`device`

例如：

```python
device = torch.device("cuda")
model = model.to(device)
x = x.to(device)
```

这样：

```text
model → GPU
x     → GPU
```

才能做：

`model(x)`

如果：

```text
model = GPU
x = CPU
```

就会报错。

你以后一定会经常看到：

```python
device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)
```

现代 PyTorch 也已经把 CUDA、MPS、XPU 等多种 accelerator 纳入统一加速器体系。

## 十八、为什么训练模型这么吃显存？

GPU 显存里面并不只是模型权重。

训练时通常至少包括：

- 模型权重
- activation
- gradient
- optimizer state

以 AdamW 为例尤其明显。

如果参数：

7B

BF16 权重约：

$$ 7B\times2Byte\approx14GB $$

但训练远不止 14 GB。

还需要 gradient、optimizer states、activations。

这就是为什么：

7B 模型推理

和：

7B 模型 full finetuning

显存需求可能差几倍。

## 十九、LoRA 为什么省显存？

这正好和你训练 π0.5 有关系。

正常 full finetuning：

- Transformer 里的大量参数
- 全部更新

LoRA：

- 原模型参数冻结
- `W` 不训练

只训练：
`A` 和 `B`

相当于：

$$ W'=W+\Delta W $$

其中：

$$ \Delta W=BA $$

而且 rank：

$$ r\ll d $$

于是：

trainable parameters

大幅减少。

PyTorch 视角就是：

`param.requires_grad = False`

冻结绝大多数 Parameter。

只有 LoRA 参数：

`requires_grad = True`

所以：

`loss.backward()`

不会为被冻结参数保存需要的训练梯度。

## 二十、requires_grad、detach() 和 no_grad()

这三个非常重要。

`requires_grad=True`

表示：

我要对这个 Tensor 求梯度

例如：

```python
x.requires_grad = True
z = x.detach()
```

表示：

从当前计算图中断开。

比如：

```python
y = model(x)
z = y.detach()
```

那么后面通过 z 的运算不会把梯度反传回 model。

`torch.no_grad()`

推理时：

```python
with torch.no_grad():
    output = model(x)
```

因为推理：

```text
不训练 → 不需要 gradient → 不需要建立完整反向图
```

所以更省显存。

## 二十一、model.train() 和 model.eval()

这个非常容易误解。

`model.train()`

不是开始训练。

它只是：

把模型切换成 training mode。

而：

`model.eval()`

是：

evaluation mode。

为什么需要？

因为有一些层：

- Dropout
- BatchNorm

训练和推理行为不同。

所以：

`model.train()`

会让这些层按训练模式工作。

而：

`model.eval()`

让它们按推理方式工作。

真正训练还是：

```python
loss.backward()
optimizer.step()
```
## 二十二、state_dict 和 checkpoint

一个 PyTorch 模型里真正重要的其实通常不是整个 Python 对象，而是：

`model.state_dict()`

它里面放：

参数名 → Tensor

例如：

```text
fc1.weight
fc1.bias
fc2.weight
fc2.bias
```

常见保存：

```python
torch.save(
    model.state_dict(),
    "model.pth"
)
```

加载：

```python
model.load_state_dict(
    torch.load("model.pth")
)
```

这也是官方推荐的常见模型保存方式。

## 二十三、真正训练时 checkpoint 往往不只保存模型

例如：

```python
checkpoint = {
    "model": model.state_dict(),
    "optimizer": optimizer.state_dict(),
    "step": step,
    "loss": loss
}
```

为什么？

假设训练到了：

step 10000

服务器挂了。

如果只有：

model

那你虽然有权重，但 optimizer 的：

- momentum
- Adam 一阶矩
- Adam 二阶矩

全丢了。

而完整 checkpoint 可以：

从10000继续训练

这也是为什么你之前看到：

checkpoint 10000

它不是简单的“模型第 10000 版”。

而通常代表：

训练进行了约 10000 个 optimization steps 后保存的模型状态。

## 二十四、一个 step 到底是什么？

很多人容易把：

- epoch
- step
- batch

搞混。

假设：

```text
dataset = 1000 samples
batch_size = 10
```

那么：

$$ 1000/10=100 $$

个 batch。

每跑一个 batch：

`optimizer.step()`

一次，就是：

1 training step

所以：

100 steps ≈ 1 epoch

Epoch 表示：

数据集大致完整看过一遍。

Step 表示：

optimizer 更新一次。

大模型/VLA 更常用：

step

而不是：

epoch

来描述训练量。

## 二十五、AMP / BF16 / FP16

现代深度学习不会总用：

FP32

因为太耗显存和算力。

常见：

- FP16
- BF16

PyTorch 有：

`torch.amp`

进行 automatic mixed precision。

思想是：

- 有些计算 → BF16 / FP16
- 敏感计算 → FP32

得到：

- 更低显存
- 更高吞吐量

现在大模型训练里 BF16 非常常见。

## 二十六、PyTorch 多 GPU 怎么训练？

PyTorch 有：

`torch.distributed`

最经典的是：

`DistributedDataParallel`

简称：

DDP

例如 8 张 GPU：

```text
GPU0 → process0
GPU1 → process1
...
GPU7 → process7
```

每个 GPU 上都有：

一个模型副本

不同 GPU 处理不同 batch。

然后反向传播：

```text
GPU0 gradients
GPU1 gradients
...
GPU7 gradients

       ↓

all-reduce

       ↓

同步 gradient
```

然后每张卡同时更新。

PyTorch 官方目前也把 DDP 定义为建立在 torch.distributed 通信原语上的同步分布式训练机制，并支持单机和多机。

## 二十七、PyTorch 和 CUDA 是什么关系？

这两个不要混淆。

> PyTorch ≠ CUDA

PyTorch 是：

深度学习框架

CUDA 是：

NVIDIA GPU计算平台

关系类似：

```text
PyTorch → 调用 CUDA → NVIDIA GPU
```

所以：

`torch.cuda`

只是 PyTorch 对 CUDA 的接口。

## 二十八、PyTorch 和 Transformer 是什么关系？

也经常有人混淆。

PyTorch 是：

框架

Transformer 是：

模型架构

所以你可以：

用 PyTorch 写 Transformer

也可以：

用 JAX 写 Transformer

也可以：

TensorFlow 写 Transformer

类似：

- PyTorch = 乐高系统
- Transformer = 用乐高搭出的某种结构
## 二十九、PyTorch、Transformers、PEFT 也不是一回事

你可能经常看到：

```python
import torch
from transformers import ...
from peft import ...
```

关系是：

```text
PyTorch
  └─ 底层 Tensor / Autograd / GPU
HuggingFace Transformers
  └─ GPT / Llama / ViT / etc 模型实现
PEFT
  └─ LoRA / Adapter 等参数高效微调
```

Transformers 很多模型实际上就是：

```python
class XXXModel(torch.nn.Module):
    ...
```
## 三十、PyTorch 和 JAX 的关系尤其值得你理解

因为你现在用 OpenPI / π0.5。

这里非常重要：

OpenPI 主体训练栈长期大量采用 JAX，而不是经典 PyTorch training loop。

所以你看到 π0.5 代码时，不一定会看到：

```python
loss.backward()
optimizer.step()
```

JAX 可能是：

- `jax.grad`
- `jax.value_and_grad`
- `optax`
- `jit`
- `pmap` / sharding

但数学逻辑完全一样。

可以这样对应：

| PyTorch | JAX |
| --- | --- |
| `torch.Tensor` | `jax.Array` |
| `nn.Module` | Flax / NNX Module |
| `loss.backward()` | `jax.grad()` |
| `torch.optim` | Optax |
| `.cuda()` | JAX device placement |
| DDP | `pmap` / sharding |
| Autograd | automatic differentiation |
| `torch.compile` | `jax.jit` |

所以学习 PyTorch 非常有价值。

因为你真正学习的是：

现代深度学习训练范式。

之后转 JAX，只是 API 不一样。
