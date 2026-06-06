# SM3 Circom Library

SM3 密码杂凑算法的零知识证明电路库（circom 实现），支持 Groth16 证明协议。

基于论文: *"Implementation and Optimization of Zero-Knowledge Proof Circuit Based on Hash Function SM3"* (Sensors 2022, 22(16), 5951)

A vibe coding project with OpenCode + DeepSeekV4 Pro.

---

## 环境要求

| 工具 | 安装 |
|------|------|
| Rust | `curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf \| sh` |
| Node.js ≥ 18 | [nodejs.org](https://nodejs.org) |
| circom 2.2.x | `git clone https://github.com/iden3/circom.git && cd circom && cargo build --release && cargo install --path circom` |
| snarkjs ≥ 0.7 | `npm install -g snarkjs` |

> ⚠️ npm 上的 `circom` 包是旧的 v1 (JavaScript) 版本，已废弃。必须从 GitHub 源码编译安装 v2。

---

## 项目结构

```
sm3circom/
├── circuits/                       # SM3 circom 库
│   ├── sm3.circom                  # 顶层: SM3Single, SM3(k)
│   ├── sm3_compression.circom      # 压缩函数 CF(V,B)→V'
│   ├── sm3_expand.circom           # 消息扩展 W[0..67], W'[0..63]
│   ├── sm3_round.circom            # 单轮函数 (双态表示, 编译期分支)
│   ├── modadd.circom               # 模 2^32 加法 (论文 Num2Bits 方式)
│   ├── bit_ops.circom              # 位运算 (XOR2/3, AND, OR, NOT, FF, GG)
│   ├── ff_gg.circom                # FF/GG (编译期优化, 无 MUX 冗余)
│   ├── perm.circom                 # P0/P1 置换函数
│   └── pack.circom                 # Num2Bits / Bits2Num
├── test/                           # 测试用例 (与库严格分离)
│   ├── circuits/                   # 测试电路入口
│   │   ├── sm3_1block_test.circom
│   │   ├── sm3_2block_test.circom
│   │   └── sm3_3block_test.circom
│   ├── run_all_tests.js            # 综合测试 (9 组, hash + proof)
│   ├── test_sm3.js                 # 简单测试入口
│   └── example_helloworld.js       # ZKP 教程
├── scripts/
│   ├── sm3/                        # SM3 专用工具
│   │   ├── ref.js                  # 参考实现 (JavaScript)
│   │   ├── padding.js              # 消息填充 (电路外)
│   │   └── pad.js                  # CLI 输入生成
│   └── tools/                      # 通用 ZKP 工具 (电路无关)
│       ├── compile.js              # 编译 circom 电路
│       ├── powersoftau.js          # Powers of Tau 仪式
│       ├── setup.js                # Groth16 电路设置
│       ├── witness.js              # 生成见证
│       ├── prove.js                # 生成证明
│       └── verify.js               # 验证证明
├── build/                          # 编译产物 (gitignore)
├── package.json
└── README.md
```

---

## 快速开始

### 角色分离

```
┌───────────────────────────────────────────────────┐
│                Infrastructure                      │
│  compile → powersoftau → setup  (一次性)           │
│  输出: *.r1cs, *.zkey, *.vkey.json                │
└───────────────┬──────────────────┬────────────────┘
                │                  │
     ┌──────────▼────────┐  ┌──────▼──────────────┐
     │      Prover       │  │      Verifier       │
     │  持有 zkey + 原像  │  │  持有 vkey + proof  │
     │  pad→witness→prove │  │  verify → OK/FAIL  │
     └────────────────────┘  └─────────────────────┘
```

### Infrastructure (一次性)

```bash
# 编译测试电路
circom test/circuits/sm3_1block_test.circom --wasm --r1cs --sym -o build
circom test/circuits/sm3_2block_test.circom --wasm --r1cs --sym -o build
circom test/circuits/sm3_3block_test.circom --wasm --r1cs --sym -o build

# Powers of Tau (Phase 1, 跨电路复用)
node scripts/tools/powersoftau.js new 19 build/pot_0000.ptau
node scripts/tools/powersoftau.js contribute build/pot_0000.ptau build/pot_0001.ptau
node scripts/tools/powersoftau.js prepare build/pot_0001.ptau build/pot_final.ptau

# 电路专用设置 (Phase 2)
node scripts/tools/setup.js build/sm3_1block_test.r1cs build/pot_final.ptau \
  build/sm3_1block_test.zkey build/sm3_1block_test.vkey.json
node scripts/tools/setup.js build/sm3_2block_test.r1cs build/pot_final.ptau \
  build/sm3_2block_test.zkey build/sm3_2block_test.vkey.json
node scripts/tools/setup.js build/sm3_3block_test.r1cs build/pot_final.ptau \
  build/sm3_3block_test.zkey build/sm3_3block_test.vkey.json

# 分发:
# 给 Prover:   build/sm3_*_test.zkey + build/sm3_*_test_js/
# 给 Verifier: build/sm3_*_test.vkey.json
```

### Prover (每次新消息)

```bash
# 生成输入
node scripts/sm3/pad.js "hello world" --out build/input.json

# 生成见证
node scripts/tools/witness.js \
  build/sm3_1block_test_js/sm3_1block_test.wasm \
  build/input.json build/witness.wtns

# 生成证明
node scripts/tools/prove.js \
  build/sm3_1block_test.zkey build/witness.wtns \
  build/proof.json build/public.json
```

### Verifier

```bash
node scripts/tools/verify.js \
  build/sm3_1block_test.vkey.json \
  build/proof.json build/public.json
# → ✓ VERIFIED
```

---

## 库 API

```circom
pragma circom 2.2.3;
include "circuits/sm3.circom";

// ─── 单块消息 ───
component main = SM3Single();
// 输入: msg_val[16]   — 16 个 field 元素 (1 个填充块)
// 输出: hash_val[8]    — 8 个 field 元素 (SM3 hash)

// ─── 多块消息 ───
component main = SM3(3);  // k = 填充块数
// 输入: msg_blocks_val[k][16]
// 输出: hash_val[8]
```

### 底层模板

```circom
// 压缩函数
component cf = SM3Compression();
// V_val[8] + B_val[16] → V_next_val[8], V_next_bits[8][32]

// 消息扩展
component exp = SM3MessageExpand();
// msg_val[16] → W_val[68], W_bits[68][32], Wp_val[64], Wp_bits[64][32]

// 单轮 (j 为编译期常量)
component round = SM3Round(5);
// 双态: A_val..H_val + A_bits..H_bits[32] + W + Wp + Tj → 下一轮状态
```

---

## 电路示例

### 1. 基础哈希计算

```circom
pragma circom 2.2.3;
include "circuits/sm3.circom";

// 计算 SM3("hello")，电路外已完成填充
component main {public [hash_val]} = SM3Single();
// 公开输出 hash_val，验证者可见
// 私有输入 msg_val[16]，证明者持有
```

### 2. 哈希原像证明 (Hash Preimage ZKP)

```circom
pragma circom 2.2.3;
include "circuits/sm3.circom";

// 证明: 我知道 x，使得 SM3(x) = y
// y 是公开的，x 是私有的
template SM3Preimage() {
    signal input preimage_val[16];  // 私有: 填充后的原像
    signal input target_hash[8];    // 公开: 目标 hash 值

    component sm3 = SM3Single();
    sm3.msg_val <== preimage_val;

    // 约束: 计算的 hash 必须等于目标
    for (var i = 0; i < 8; i++) {
        sm3.hash_val[i] === target_hash[i];
    }
}

component main {public [target_hash]} = SM3Preimage();
```

### 3. 哈希链证明

```circom
pragma circom 2.2.3;
include "circuits/sm3.circom";

// 证明: SM3(SM3(x)) = y，不泄露 x
template SM3Chain2() {
    signal input preimage_val[16];
    signal input target_hash[8];

    signal mid_hash[8];
    (mid_hash) <== SM3Single()(preimage_val);

    component sm3_2 = SM3Single();
    sm3_2.msg_val <== mid_hash;  // mid_hash 是 8 个 field 值, 需 pad 到 16
    for (var i = 8; i < 16; i++) { sm3_2.msg_val[i] <== 0; }

    for (var i = 0; i < 8; i++) {
        sm3_2.hash_val[i] === target_hash[i];
    }
}
```

### 4. 两原像等价证明

```circom
pragma circom 2.2.3;
include "circuits/sm3.circom";

// 证明: 两个不同消息有相同的 SM3 哈希 (碰撞)
// 公开输出 hash; 两个原像都是私有的
template SM3Collision() {
    signal input msg1_val[16];
    signal input msg2_val[16];
    signal output hash_val[8];

    component sm3_1 = SM3Single();
    sm3_1.msg_val <== msg1_val;

    component sm3_2 = SM3Single();
    sm3_2.msg_val <== msg2_val;

    // 约束: 两个哈希相等
    for (var i = 0; i < 8; i++) {
        sm3_1.hash_val[i] === sm3_2.hash_val[i];
    }

    for (var i = 0; i < 8; i++) {
        hash_val[i] <== sm3_1.hash_val[i];
    }
}
```

### 5. Merkle 树节点验证

```circom
pragma circom 2.2.3;
include "circuits/sm3.circom";

// 证明: hash(left || right) = parent，已知 parent，不泄露 left/right
template SM3MerkleNode() {
    signal input left_val[8];       // 左子节点 hash (field 值)
    signal input right_val[8];      // 右子节点 hash
    signal input expected_parent[8]; // 公开: 父节点 hash

    // 拼接 left || right 为一个 512-bit 块
    signal msg_val[16];
    for (var i = 0; i < 8; i++) {
        msg_val[i]     <== left_val[i];
        msg_val[i + 8] <== right_val[i];
    }

    component sm3 = SM3Single();
    sm3.msg_val <== msg_val;

    for (var i = 0; i < 8; i++) {
        sm3.hash_val[i] === expected_parent[i];
    }
}

component main {public [expected_parent]} = SM3MerkleNode();
```

### 6. 多块消息 (56+ 字节)

```circom
pragma circom 2.2.3;
include "circuits/sm3.circom";

// 消息填充后产生 2 个块
component main {public [hash_val]} = SM3(2);
// 输入: msg_blocks_val[2][16] (私有)
// 输出: hash_val[8]           (公开)
```

### 7. SM3 承诺方案

```circom
pragma circom 2.2.3;
include "circuits/sm3.circom";

// 承诺: H(secret || nonce) = commitment
// 证明知道 secret 但仅公开 commitment 和 nonce
template SM3Commitment() {
    signal input secret_val[8];        // 私有: 秘密值
    signal input nonce_val[8];         // 公开: 随机数
    signal input expected_commit[8];   // 公开: 承诺值

    signal msg_val[16];
    for (var i = 0; i < 8; i++) {
        msg_val[i]     <== secret_val[i];
        msg_val[i + 8] <== nonce_val[i];
    }

    component sm3 = SM3Single();
    sm3.msg_val <== msg_val;

    for (var i = 0; i < 8; i++) {
        sm3.hash_val[i] === expected_commit[i];
    }
}

component main {public [nonce_val, expected_commit]} = SM3Commitment();
```

### 8. 自定义模板复用

```circom
pragma circom 2.2.3;
include "circuits/sm3_compression.circom";

// 直接使用压缩函数 CF 构建自定义哈希结构
template CustomHash() {
    signal input block1[16];   // 第一个 512-bit 块
    signal input block2[16];   // 第二个 512-bit 块
    signal output result[8];   // 256-bit 输出

    // 自定义 IV
    signal iv[8];
    iv[0] <== 0x7380166f;
    iv[1] <== 0x4914b2b9;
    iv[2] <== 0x172442d7;
    iv[3] <== 0xda8a0600;
    iv[4] <== 0xa96f30bc;
    iv[5] <== 0x163138aa;
    iv[6] <== 0xe38dee4d;
    iv[7] <== 0xb0fb0e4e;

    // 第一层压缩
    signal mid_val[8];
    signal mid_bits[8][32];
    (mid_val, mid_bits) <== SM3Compression()(iv, block1);

    // 第二层压缩
    signal out_val[8];
    signal out_bits[8][32];
    (out_val, out_bits) <== SM3Compression()(mid_val, block2);

    for (var i = 0; i < 8; i++) {
        result[i] <== out_val[i];
    }
}
```

---

## 电路架构

四层结构（论文 Section 4），双态表示（field val + bit array），场加法 + Num2Bits 模约简：

| 层 | 文件 | 约束 |
|----|------|------|
| 辅助运算 | `bit_ops.circom` `modadd.circom` `pack.circom` | AddMod3=68, Num2Bits(n)=n+1 |
| 核心运算 | `ff_gg.circom` `perm.circom` | FF_HIGH=128, GG_HIGH=64, XOR3w=64 |
| 迭代压缩 | `sm3_expand.circom` `sm3_round.circom` `sm3_compression.circom` | 64轮×~326 NL |
| Merkle-Damgård | `sm3.circom` | 线性增长 |

**关键优化:**
- FF/GG 编译期分支: j<16 用 XOR3w (64), j≥16 用专用模板 (128/64)
- 消息填充在电路外完成 (Section 5.1.4)
- 循环移位零成本 (wire 置换)

---

## 性能

| 电路 | 约束 | Wires | 消息范围 |
|------|------:|------:|------|
| 单块 (1×512b) | 41,430 | 41,229 | 0–55 字节 |
| 双块 (2×512b) | 82,860 | 82,457 | 56–119 字节 |
| 三块 (3×512b) | 124,290 | 123,685 | 120–183 字节 |

证明大小 (Groth16): ~128 bytes，恒定与消息大小无关。

---

## 测试用例

```bash
# 运行全部测试
node test/run_all_tests.js
```

| 用例 | 字节 | 块 | SM3 Hash (前 16 位) | Hash | Proof |
|------|:--:|:--:|------|:--:|:--:|
| `""` | 0 | 1 | `1ab21d8355cfa17f...` | ✓ | ✓ |
| `"a"` | 1 | 1 | `623476ac18f65a29...` | ✓ | ✓ |
| `"abc"` (GM/T 标准) | 3 | 1 | `66c7f0f462eeedd9...` | ✓ | ✓ |
| `"helloworld"` | 10 | 1 | `c70c5f73da4e8b8b...` | ✓ | ✓ |
| `"A"×55` (1块边界) | 55 | 1 | `a8b5bef8b3666e02...` | ✓ | ✓ |
| `"B"×56` (跨入2块) | 56 | 2 | `889dbc63bdc6b074...` | ✓ | ✓ |
| `"abcd"×16` (GM/T 标准) | 64 | 2 | `debe9ff92275b8a1...` | ✓ | ✓ |
| `"C"×119` (2块边界) | 119 | 2 | `ff5c980bdca481a0...` | ✓ | ✓ |
| `"D"×120` (跨入3块) | 120 | 3 | `3f5b49137acf5764...` | ✓ | ✓ |

---

## 常见问题

| 错误 | 原因 | 解决 |
|------|------|------|
| `T2011` | for 循环内声明了 signal | 表达式式实例化 `x <== T()(args)` |
| `T3001` "not initialized" | 信号在约束前未赋值 | 先 `<--` witness，再 `===` |
| `T3001` "non quadratic" | 表达式含 ≥2 个信号乘法 | 拆为中间信号 |
| `[ERROR] snarkJS: circuit too big` | ptau power 不够 | 提升 power: `powersoftau.js new 20` |
| proof verify 失败 | zkey/vkey 与 R1CS 不匹配 | 重新 `setup.js` |

---

## 引用

```bibtex
@article{yang2022sm3,
  title   = {Implementation and Optimization of Zero-Knowledge Proof
             Circuit Based on Hash Function SM3},
  author  = {Yang, Yang and Han, Shangbin and Xie, Ping and Zhu, Yan
             and Ding, Zhenyang and Hou, Shengjie and Xu, Shicheng
             and Zheng, Haibin},
  journal = {Sensors},
  volume  = {22},
  number  = {16},
  pages   = {5951},
  year    = {2022},
  doi     = {10.3390/s22165951}
}
```
