---
title: "从相机坐标系到 VIO-World：一次 UMI 微调 π0.5 的完整踩坑复盘"
description: "从原始 MCAP、头部运动补偿、相对 action chunk、LeRobot 转换，到 8 卡 π0.5 微调，复盘一条真正可验证的 UMI 训练链路。"
publishedAt: 2026-09-24
tags: ["UMI", "π0.5", "VLA", "机器人学习", "模型训练"]
featured: true
draft: false
---

把 UMI 数据送进 VLA 模型，看起来只需要三步：读取图像和位姿、转换成 LeRobot、启动训练。

真正做下来，我发现最危险的问题都不在模型结构里，而在数据语义里：MCAP 中的 pose 到底属于哪个坐标系？头部相机移动后，末端 pose 为什么也会变化？action chunk 里的第二个动作究竟相对谁？多卡训练的 step 又该怎样换算？

这些问题如果没有先回答清楚，训练可以正常运行，loss 也可以下降，但模型学到的可能是一套根本无法部署的动作定义。

本文复盘一次完整的 UMI 到 π0.5 微调过程。重点不是给出一组只能在某台服务器上运行的命令，而是说明如何把坐标系、动作标签、数据格式和训练配置连成一条可验证的链路。

## 起点：能看到视频，不代表 episode 可以训练

原始数据由多个 `.vio.mcap` episode 组成。一个文件中可以同时包含：

- 三组双目相机，共六路 H.264 视频；
- 头部和腕部 IMU；
- 头部 VIO pose；
- 左右夹爪状态；
- 左右末端 pose；
- 触觉数据。

最初很容易把“视频能正常播放”当成“这条数据可用”。但视频与控制标签是两件事。有些文件有完整视频、夹爪和头部 pose，却没有对应手臂的末端 pose。这样的 episode 可以预览，却不能生成该手臂的监督动作。

对当前这批数据做全量统计后，结果是：

| 项目 | 数值 |
| --- | ---: |
| MCAP 数量 | 189 |
| 总记录时长 | 约 20.26 分钟 |
| 右臂末端 pose 完整覆盖 | 189 / 189 |
| 左臂末端 pose 覆盖 | 35 / 189 |
| 右臂末端 pose 消息 | 35,704 |
| 头部 VIO pose 消息 | 11,976 |
| 头部左视频帧 | 36,477 |
| 右腕右视频帧 | 36,434 |

因此，这批数据应该被定义为右臂主数据集，而不是左右臂数据集。左夹爪状态存在，并不能弥补左臂 pose 缺失。

第一个经验是：

> 数据质量统计必须以训练所需的监督信号为准，而不是以“文件能否打开”或“视频能否播放”为准。

## 最关键的误区：末端 pose 并不天然属于世界坐标系

原始 MCAP 中有两级关键位姿。用齐次变换表示：

$$
{}^W T_C(t)
$$

表示时刻 $t$ 头部相机在 VIO world 中的位姿；

$$
{}^C T_E(t)
$$

表示 UMI 末端在头部相机坐标系中的位姿。

如果直接使用 ${}^C T_E(t)$ 训练，就等于把一个随头部移动的相机坐标系当成动作参考系。

假设末端在物理世界中完全不动，但头部相机向前移动 10 cm。此时相机看到的末端相对位置会变化，所以 ${}^C T_E(t)$ 也会变化。如果直接对它做差，数据会虚构出一个“末端动作”，而实际移动的是头部。

正确的第一步是先恢复末端在 VIO world 中的位姿：

$$
{}^W T_E(t)
=
{}^W T_C(t)
{}^C T_E(t)
$$

这一步才是真正的头部运动补偿。

如果头部移动而末端保持不动，那么组合后的 ${}^W T_E(t)$ 应尽量保持稳定。反过来，若末端和头部一起移动，这个组合也能保留末端在物理空间中的真实运动。

## “世界坐标系”也可能名不副实

第一次尝试 world-frame 转换时，我把每个 episode 的第一帧头部 pose 设成了单位变换：平移减去第一帧位置，旋转再左乘第一帧旋转的逆。

这种表示在数学上没有错，但它得到的是一个 episode 内归一化的 `world_ep0`：原点位于第一帧头部相机，坐标轴也跟着第一帧相机朝向旋转。它并不是原始 VIO 输出的 world 方向。

问题最终不是通过 loss 发现的，而是通过坐标轴可视化发现的。可视化中，VIO world 轴和相机轴方向明显不同，而转换后的所谓 world 却与首帧相机对齐。这说明配置名虽然写着 `world`，实际语义却是 `head-at-episode-start`。

后续我把两种表示明确分开：

- `world_ep0`：每个 episode 用首帧头部 pose 重新定原点和方向；
- `vio_world`：保留记录中的原始 VIO world 轴，不再额外旋转。

这个坑说明：

> 坐标系不能靠变量名确认，必须把轴画出来，并把变换矩阵逐项核对。

## 为什么最后仍然使用相对 action

恢复 ${}^W T_E(t)$ 后，并不意味着模型必须输出世界系绝对位置。

最终采用的标签受到 RDT2 中 embodiment-agnostic UMI 动作建模思路启发，但不是对 RDT2 训练配方的复刻。对每个当前时刻 $t$，我生成一个长度为 24 的 action chunk：

$$
A_{t,k}
=
\left({}^W T_E(t)\right)^{-1}
{}^W T_E(t+k),
\quad k=1,\ldots,24
$$

具体含义是：

```text
action[0]  = 当前时刻 t → t+1
action[1]  = 当前时刻 t → t+2
...
action[23] = 当前时刻 t → t+24
```

所有未来动作都锚定在同一个当前末端位姿，而不是相邻帧连锁差分：

```text
不是：t→t+1, t+1→t+2, t+2→t+3, ...
```

这一区别非常重要。部署时，模型一次输出的 24 个动作可以分别由当前末端位姿还原为未来目标，不需要先执行 action 0，才能解释 action 1。

## 相对 action 为什么仍然需要 VIO

一个容易产生的疑问是：既然最后使用相对位姿，VIO world 的原点和方向都会消掉，那么还有必要先转换到 VIO world 吗？

对整条轨迹左乘任意固定变换 $G$：

$$
T_i' = G T_i
$$

则：

$$
\left(T_t'\right)^{-1}T_{t+k}'
=
\left(GT_t\right)^{-1}GT_{t+k}
=
T_t^{-1}T_{t+k}
$$

这证明了固定的 world 原点和固定朝向确实会从相对 action 中消失。因此，不同 episode 的 VIO 初始化原点没有必要被强行对齐。

但头部相机运动不是一个固定的 $G$，而是随时间变化的 ${}^W T_C(t)$。如果跳过组合：

$$
{}^W T_E(t)={}^W T_C(t){}^C T_E(t)
$$

直接在相机系 pose 上计算相对动作，那么 $t$ 和 $t+k$ 使用的是两个不同的相机参考系，头部运动仍然会污染标签。

所以正确顺序是：

```text
先逐帧补偿头部运动
        ↓
得到同一 VIO world 中的末端轨迹
        ↓
再相对于当前末端生成未来 action chunk
```

“固定坐标系变换会抵消”与“可以忽略动态头部运动”是两件完全不同的事。

## 每个 action 为什么是 10 维

MCAP 中的原始 pose 使用 `xyz + quaternion(x, y, z, w)`；进入训练前统一转换为：

```text
relative position             3D
relative rotation 6D          6D
future gripper width          1D
--------------------------------
per-action                    10D
```

相对平移为：

$$
\Delta p_{t,k}
=
R_t^\top(p_{t+k}-p_t)
$$

它表达在当前末端坐标轴中，而不是 world 轴中。

相对旋转为：

$$
\Delta R_{t,k}=R_t^\top R_{t+k}
$$

然后取旋转矩阵的前两列组成 rotation 6D。相比直接回归四元数，它没有 $q$ 与 $-q$ 表示同一旋转的二义性；相比 axis-angle，它也避开了角度边界附近的不连续。

夹爪维度使用未来时刻的绝对宽度，而不是夹爪宽度增量。

因此，数据集中的 action shape 是：

$$
[24,10]
$$

π0.5 内部配置的 action dim 仍为 32，进入模型前把最后一维从 10 padding 到 32；推理输出再裁回前 10 维。

## state 是否应该包含当前位姿

早期方案把当前绝对 pose 当作 state，同时把未来相对 pose 当作 action。这样虽然可以训练，但引入了两个问题：

第一，state 的绝对值依赖 episode 的 VIO 初始化；第二，模型可能依赖采集设备的绝对数值，而不是主要从图像理解场景。

最终方案采用 state-free 设计：

```text
position   = [0, 0, 0]
rotation6d = [1, 0, 0, 0, 1, 0]
```

在实际实现中，为了彻底避免模型从 state 获得位姿信息，直接把整个 10 维 state 固定为零向量，并在模型 transform 中再次强制清零。

这里遇到了一个很隐蔽的数值问题。零 state 的统计量满足：

$$
q_{01}=q_{99}=0
$$

若直接做分位数归一化，分母为零，可能产生 NaN。仅仅在原始数据中写零并不够，必须保证归一化之后、tokenize 之前再次把 state 设为零。

这也是为什么数据接口需要两层约束：

- 数据集校验 state 必须严格为零；
- 模型输入 transform 在归一化后再次执行 `ForceZeroState`。

部署端即使还沿用旧协议传入 pose，这些数值也会被显式忽略。

## LeRobot 转换并不是简单改列名

标准 LeRobot 数据通常每行保存一个单步 action，再通过 `delta_timestamps` 在加载时抽取未来序列。

这次的数据在转换阶段已经物化成完整的 `[24,10]` chunk。如果仍然保留：

```python
action_sequence_keys=("action",)
```

加载器会把已经 chunk 化的 action 再做一次时间采样，产生错误的额外维度或错误语义。

正确配置是：

```python
action_sequence_keys=()
```

告诉加载器：每一行已经包含完整 action chunk，不要再次沿时间轴展开。

另一个问题是 Parquet schema。原有 writer 只支持一维数值向量，而 action 现在是二维数组。最终 writer 使用嵌套 fixed-size list 保存：

```text
fixed_size_list<
  fixed_size_list<float32, 10>,
  24
>
```

如果这里不显式支持多维 shape，即使 NumPy 数组本身正确，也会在 Arrow 写入阶段失败。

## 为什么数据转换与模型训练必须分开

我最初倾向于用一个脚本完成：转换数据、计算统计量、立即开始训练。这样看起来方便，却让错误很难定位。

最终把流程拆成两个独立阶段。

数据阶段负责：

1. 读取原始 MCAP；
2. 在 30 Hz 时间线上同步视频、VIO、末端 pose 和夹爪；
3. 插值相对稀疏的头部 VIO pose；
4. 合成 ${}^W T_E(t)$；
5. 生成 `[24,10]` action chunk；
6. 丢弃无法提供完整 24 步未来窗口的尾部 anchor；
7. 写入一个全新的 LeRobot 目录；
8. 独立运行全量验证。

训练阶段只接受已经通过验证的数据集，再执行归一化统计、batch 加载、模型初始化和优化。

这样做的直接收益是：模型训练失败时，不需要怀疑转换是否在后台悄悄改变；更换 batch 或学习率时，也不用重新生成数据。

## 不要一上来就转换全部数据

完整数据转换前，我先选一个 MCAP 做冒烟测试。测试不是只看脚本能否退出，而是检查：

- state shape 是否为 `[10]` 且严格全零；
- action shape 是否为 `[24,10]`；
- LeRobot 能否通过正式 loader 读取视频和二维 action；
- 第 $k$ 个 action 是否确实对应 $t\rightarrow t+k$；
- rotation 6D 能否恢复为正交且行列式为 1 的旋转矩阵；
- 夹爪值是否来自正确的未来帧。

单条测试通过后才转换全部 189 个 episode。最终得到：

```text
189 episodes
30,336 samples
state shape:  [10]
action shape: [24, 10]
```

为了让验证不依赖转换代码自己“证明自己”，数据中额外保留了只用于审计的原始同步 pose。验证器从这些原始 pose 重新合成 world pose，再独立重建 action，与写入的标签逐项比较。

全量结果为：

| 校验项 | 最大误差 |
| --- | ---: |
| 平移重建误差 | $7.5\times10^{-8}$ m |
| 旋转矩阵误差 | $8.6\times10^{-8}$ |
| rotation 6D 正交性误差 | $8.9\times10^{-16}$ |
| 固定坐标变换不变性误差 | $1.4\times10^{-15}$ |

另外随机进行了 1000 次固定世界坐标变换不变性检查，全部通过。

这比“随机打印几行 action，看起来数值不大”可靠得多。

## Flow Matching 如何同时更新 24 个相对动作

我曾经困惑：如果 action 是相对动作，第二个 action 是否必须依赖第一个 action？如果是这样，flow matching 怎么同时生成整个 chunk？

这个疑问来自把两种相对定义混在了一起。

当前定义中：

$$
A_t=
[A_{t,1},A_{t,2},\ldots,A_{t,24}]
\in\mathbb{R}^{24\times10}
$$

每一个 $A_{t,k}$ 都直接相对于同一个 $T_t$。它们共同构成一个 240 维连续变量，而不是一个必须顺序积分的链。

训练时从高斯噪声 $\epsilon$ 和真实 chunk $A_t$ 构造中间状态，例如：

$$
A_t^\tau=(1-\tau)\epsilon+\tau A_t
$$

动作专家预测整个张量上的速度场：

$$
v_\theta(\tau,A_t^\tau,\text{condition})
\in\mathbb{R}^{24\times10}
$$

所以 24 个未来目标可以在每次去噪/积分更新中并行变化。它们在 Transformer 中互相注意，但不存在“必须先算出 action 0 才能定义 action 1”的数学依赖。

## 8 卡训练的 step 应该怎样换算

另一个容易误解的问题是：用了 8 张卡，是不是每张卡各训练 11,250 step，总共变成 90,000 step？

不是。数据并行训练中的 step 是全局 optimizer step。每个 step 中，8 张卡各处理一部分 batch，梯度聚合后只进行一次全局参数更新。

旧配置是：

```text
GPU:          6
global batch: 24
per-GPU:      4
steps:        30,000
```

对应处理的样本数约为：

$$
24\times30,000=720,000
$$

新配置希望提高每卡负载和并行效率：

```text
GPU:          8
global batch: 64
per-GPU:      8
steps:        11,250
```

样本数仍然是：

$$
64\times11,250=720,000
$$

因此，11,250 不是“少训练了”，而是在 global batch 增大后保持大致相同的样本预算。warmup 和 checkpoint 间隔也按相同比例缩放：

```text
warmup:       375
checkpoints:  3,750 / 7,500 / 11,250
```

这才是用多卡换取吞吐，而不是无意中把数据曝光量翻倍。

## 训练启动阶段为什么看起来像卡住

训练第一次启动时，日志长时间停在 data loader 和参数初始化附近。实际原因包括：

- 32 个 PyTorch worker 通过 spawn 依次导入依赖；
- JAX 创建模型和 optimizer state；
- FSDP 计算参数、Adam 状态和 EMA 参数的分片方式；
- Orbax 从基础 checkpoint 读取十几 GiB 参数；
- XLA 编译第一步前向和反向图。

仅根据“日志一分钟没变化”就重启，反而会反复支付初始化成本。更可靠的判断方式是同时观察：

- 主进程是否还存在；
- worker 数量是否继续增长；
- CPU 是否仍在加载；
- GPU 显存是否从单卡物化逐步转为多卡分片；
- 日志中是否出现真实 Traceback。

完成初始化后，8 张 A100 的利用率稳定在约 97%–100%，速度约为 1.0 s/step。

## tmux 存在不等于训练成功

早期有一次 tmux 会话刚创建就消失。问题不是 tmux，而是非交互 shell 中找不到 `uv`：

```text
bash: uv: command not found
```

tmux 中的命令退出后，会话自然结束，所以 `tmux attach` 只会得到 `no sessions`。

后来启动脚本固定使用仓库虚拟环境中的解释器：

```bash
.venv/bin/python scripts/train.py ...
```

并把标准输出和错误同时写入独立日志。判断是否启动成功时，我要求至少看到三件事：

1. tmux 会话仍存在；
2. 训练进程存在；
3. 日志出现真实的 `Step 0` 指标。

仅看到“server started”或“tmux running”都不够。

## 为什么正式训练前要跑一个完整 checkpoint 冒烟

只做前向测试无法覆盖以下问题：

- backward 是否能通过；
- optimizer state 是否能正确分片；
- 8 卡通信是否正常；
- 训练显存峰值是否会 OOM；
- Orbax 能否保存 params、train state 和 assets；
- 推理所需的 norm stats 是否真的进入 checkpoint。

因此正式训练前，我运行了 1 个完整 optimizer step，并强制保存 checkpoint。结果为：

```text
loss       = 0.1609
grad_norm  = 1.2353
param_norm = 1802.3865
```

随后确认 checkpoint 中同时存在：

```text
params/
train_state/
assets/
```

这个冒烟过程本身会产生几十 GiB 临时 checkpoint，保存也需要时间，但它验证的是完整训练—保存链路，而不只是模型能否加载。

正式训练开始后，step 100 的指标为：

```text
loss       = 0.0592
grad_norm  = 0.3630
param_norm = 1802.3861
```

截至本文记录时，训练仍在继续。loss 下降只能说明优化过程在收敛，不能代替真实机器人上的成功率、轨迹连续性和安全性评估。

## W&B 离线模式也是一种工程选择

训练服务器不一定始终能够稳定访问外网。相比让网络问题影响训练，我选择：

```bash
export WANDB_MODE=offline
```

训练曲线首先写入服务器本地，随后把完整 `offline-run-*` 目录复制到已经登录 W&B 的机器上，再执行：

```bash
wandb sync /path/to/offline-run-*
```

这样训练和指标上传彼此解耦。需要注意的是，不能只复制单独的 `.wandb` 文件而遗漏同目录元数据与 media。

## 部署端必须遵守同一套动作协议

训练正确并不意味着把 checkpoint 启动成 WebSocket 服务就能直接控制机械臂。

模型输出的第 $k$ 个动作是当前末端坐标系中的相对目标：

$$
{}^{E_t}T_{E_{t+k}}
$$

部署端需要在推理时刻获取当前机器人末端位姿，把模型输出还原成机器人控制器需要的目标：

$$
{}^W T_{E_{t+k}}
=
{}^W T_{E_t}
{}^{E_t}T_{E_{t+k}}
$$

rotation 6D 需要先恢复为合法旋转矩阵，夹爪宽度则按未来绝对目标解释。

如果训练端输出相对位姿，而控制端把它当世界系绝对位姿下发，模型本身再好也会产生错误动作。因此 checkpoint、norm stats、训练配置和推理 bridge 必须作为同一个版本化整体交付。

## 这次过程最终沉淀出的检查清单

### 数据进入训练前

- 不以视频是否存在判断 episode 是否可训练；
- 统计每个监督 topic 的 episode 覆盖率；
- 明确每个 pose 的 `parent_frame_T_child_frame` 语义；
- 可视化 world、camera、EEF 三组坐标轴；
- 区分固定坐标变换与随时间变化的参考系运动；
- 在单个 MCAP 上完成端到端冒烟；
- 对转换标签做独立几何重建；
- 原始数据只读，新格式写入独立目录。

### 配置进入正式训练前

- 检查 action 是单步还是已经物化的 chunk；
- 检查 loader 是否会重复做 temporal chunking；
- 检查 state 在归一化后是否仍符合设计；
- 检查真实 action dim、模型 padding dim 和输出裁剪；
- 用 global batch 计算样本预算，而不是用 GPU 数乘 step；
- 完成一次包含 backward 和 checkpoint 的多卡冒烟；
- 从日志中的真实 step 判断训练启动，而不是只看 tmux。

### 模型进入机器人前

- checkpoint 与对应 norm stats 必须成套加载；
- 客户端输入图像布局必须与训练一致；
- state-free 模型不能在部署时偷偷换回绝对 state；
- 明确每个 action 相对于当前观测还是前一个 action；
- 明确相对平移所在的坐标轴；
- 在下发真实机器人之前记录并检查完整 action chunk；
- 增加工作空间、速度、旋转和夹爪范围限制。

## 结语

这次训练最重要的收获不是把 π0.5 跑在 8 张 A100 上，而是建立了一条能够被证明正确的数据链路。

相机系模型的问题并不是“相机坐标系一定不能训练”，而是它没有把动态头部参考系与末端真实运动分开。VIO-world 的价值也不在于提供跨 episode 共享的绝对原点，而在于先把每一帧末端位姿放进同一个随时间稳定的参考系，再构造对固定原点和方向不敏感的相对动作。

最终得到的动作定义可以用一句话概括：

> 先用 VIO 补偿头部运动，再让 24 个未来动作共同相对于推理时刻的末端位姿表达。

一旦这句话在数据转换、训练 loader、模型输出和部署 bridge 中保持完全一致，后续讨论模型大小、flow matching、RTC 或真实机器人效果才有意义。

## 参考资料

- Songming Liu et al., [RDT2: Exploring the Scaling Limit of UMI Data Towards Zero-Shot Cross-Embodiment Generalization](https://arxiv.org/abs/2602.03310), 2026.
- Cheng Chi et al., [Universal Manipulation Interface: In-The-Wild Robot Teaching Without In-The-Wild Robots](https://arxiv.org/abs/2402.10329), 2024.
- Physical Intelligence, [OpenPI](https://github.com/Physical-Intelligence/openpi).
