# Literature Review

### 1. Pazzaglia et al. (2021)

**Title:** *A Deep Learning-Based Approach for Automatic Leather Classification in Industry 4.0*

**核心内容：**
 这篇是近年最直接相关的 leather classification 文献之一。作者构建了 **LASCC dataset**，数据规模较小，仅 **67 images**，并比较了 **VGG16、ResNet50、InceptionV3** 等 DCNN 在 leather/stitching classification 上的表现。([link.springer.com](https://link.springer.com/chapter/10.1007/978-3-030-68799-1_48?utm_source=chatgpt.com), )

**和你项目的关系：**
 它和你的项目最像的地方在于：同样是 **leather image classification + pretrained CNN backbone + industrial application**。
 不同点在于，这篇文章的数据规模和类别复杂度都远低于你：它只有 67 张图，而你的任务是 **203 类**，而且每类只有 1 张源图。([link.springer.com](https://link.springer.com/chapter/10.1007/978-3-030-68799-1_48?utm_source=chatgpt.com), )

**推荐用途：**
 适合放在 LR 里作为 **“leather-specific deep learning baseline”**。
 推荐程度：**高**

------

### 2. Moganam & Seelan (2022)

**Title:** *Deep learning and machine learning neural network approaches for multi class leather texture defect classification and segmentation*

**核心内容：**
 这篇工作聚焦 **multi-class leather texture defect classification**，使用了 **3600 leather images**，类别包括 non-defective、loose grain、grain off、growth marks、pinhole、folding marks 等，并比较了 **AlexNet、VGG-16、GoogLeNet、SqueezeNet、ResNet-50** 等预训练 CNN，同时结合 class activation maps 做缺陷定位。文中报告 AlexNet 在其测试集上达到 **87.60%**。([link.springer.com](https://link.springer.com/article/10.1186/s42825-022-00080-9?utm_source=chatgpt.com), )

**和你项目的关系：**
 这篇很适合支撑你“leather texture 是可被 CNN 学习的”这一点。虽然它做的是 **defect classes**，不是你这种 **203 个 leather IDs / texture classes**，但它说明预训练 CNN 在皮革纹理表面任务上是有效的。([link.springer.com](https://link.springer.com/article/10.1186/s42825-022-00080-9?utm_source=chatgpt.com), )

**推荐用途：**
 适合写在 **leather texture / defect-oriented vision research** 部分。
 推荐程度：**高**

------

### 3. Varghese et al. (2023)

**Title:** *Learning species-definite features from digital microscopic leather images*

**核心内容：**
 这篇文章不是深度 CNN 主导，而是从 **digital microscopic leather images** 中学习 species-definite pore-pattern features。作者先做图像预处理与毛孔分割，再提取 **morphological / geometrical / statistical features**，最终报告最高 **98.75% accuracy**。([sciencedirect.com](https://www.sciencedirect.com/science/article/pii/S0957417423004736?utm_source=chatgpt.com), )

**和你项目的关系：**
 它很适合支撑一个重要观点：**leather classification 的关键视觉线索并不一定是颜色，而是 grain / pore pattern 这种细粒度纹理结构。** 这和你的 leather texture classification 本质一致。
 另外，它提醒你：即使使用深度学习，显式的纹理结构信息仍然很重要。([sciencedirect.com](https://www.sciencedirect.com/science/article/pii/S0957417423004736?utm_source=chatgpt.com), )

**推荐用途：**
 适合放在 **texture cue / pore pattern importance** 这一段。
 推荐程度：**中高**

------

### 4. Varghese et al. (2025)

**Title:** *LBPMobileNet-based novel and simple leather image classification method*

**核心内容：**
 这篇很值得你引。它提出 **LBPMobileNet**，把 **LBP 纹理分析** 和 **MobileNet adaptive feature learning** 融合成 dual-stream 架构：一支处理灰度原图，一支处理 LBP feature map，然后做特征融合分类。文中报告该模型达到 **96.45% test accuracy**，并强调这种融合能提升 generalization。([link.springer.com](https://link.springer.com/article/10.1007/s00521-024-10745-7?utm_source=chatgpt.com), )

**和你项目的关系：**
 这篇和你特别贴，因为你现在用的是 **plain ResNet50 + FC**。而这篇说明：对于 leather 这种强纹理任务，**把显式纹理描述符（LBP）和 CNN 特征结合**，可能比纯 backbone 更合适。
 它可以直接支撑你在 discussion 里写：未来可以尝试 **LBP + ResNet50**、dual-stream 或 texture-aware head。([link.springer.com](https://link.springer.com/article/10.1007/s00521-024-10745-7?utm_source=chatgpt.com), )

**推荐用途：**
 适合写在 **future improvement / texture-specific model design**。
 推荐程度：**非常高**

------

### 5. Varghese et al. (2025)

**Title:** *LeaData: a novel reference data of leather images for automatic species identification*

**核心内容：**
 这篇不是方法论文，而是 **dataset paper**，但对你非常有用。作者提出 **LeaData**，总计 **38,172 images**，来自 **137 leather samples**；其中 **LeaData-V2** 含 **7,600 images**，专门覆盖大量 **non-ideal / challenging** grain behavior，**LeaData-V3** 含 **10,000 images**，覆盖不同 body parts。([nature.com](https://www.nature.com/articles/s41598-025-88040-1.pdf?utm_source=chatgpt.com), )

**和你项目的关系：**
 这篇最适合你拿来写 **dataset limitation**。因为你的数据只有 **203 张源图、每类 1 张**，而 LeaData 这类近期数据工作强调的是 **跨样本、跨 body parts、non-ideal behavior、多样性与规模**。这正好反衬出你当前项目的限制：数据独立性和多样性不足。([nature.com](https://www.nature.com/articles/s41598-025-88040-1.pdf?utm_source=chatgpt.com), )

**推荐用途：**
 适合放在 **dataset discussion / limitation / benchmark gap**。
 推荐程度：**非常高**

------

### 6. Chen et al. (2024)

**Title:** *Enhancing texture representation with deep tracing pattern encoding*

**核心内容：**
 这篇是 texture recognition 方向里很适合你项目的方法论文。作者提出 **DTPNet**，核心思想是：普通 CNN 往往只聚合最后一层特征，容易忽略浅层低级视觉线索与跨层模式，因此作者引入 **LBP-inspired** 的 local encoding，并将其嵌入 **ResNet backbones**，在 **six benchmark datasets** 上实现强表现。([sciencedirect.com](https://www.sciencedirect.com/science/article/pii/S003132032300657X?utm_source=chatgpt.com), )

**和你项目的关系：**
 这篇非常适合解释你当前方法的一个潜在不足：**ResNet50 + global pooling + FC** 对纹理任务未必最优，因为 texture recognition 更依赖 **local pattern encoding、rotation robustness、cross-layer detail**。
 它可以成为你“future work”里最学术的一条建议。([sciencedirect.com](https://www.sciencedirect.com/science/article/pii/S003132032300657X?utm_source=chatgpt.com), )

**推荐用途：**
 适合写在 **texture-specific deep representation**。
 推荐程度：**高**

------

### 7. Drehwald et al. (2023)

**Title:** *One-Shot Recognition of Any Material Anywhere Using Contrastive Learning with Physics-Based Rendering*

**核心内容：**
 这篇是 **one-shot / few-shot material recognition** 里非常适合你项目的一篇。作者提出 **MatSim**，并明确称其为首个面向 **one-shot recognition of material states** 的通用数据集与 benchmark；数据包含 **synthetic images + natural images**，目标是只用 **one or a few examples** 识别材料及其状态，并报告其方法在该 benchmark 上优于 CLIP 等比较对象。([openaccess.thecvf.com](https://openaccess.thecvf.com/content/ICCV2023/papers/Drehwald_One-Shot_Recognition_of_Any_Material_Anywhere_Using_Contrastive_Learning_with_ICCV_2023_paper.pdf?utm_source=chatgpt.com), )

**和你项目的关系：**
 你的设定本质上就是一个极端 few-shot 问题：**each class has only one source image**。所以这篇虽然不是 leather-specific，但在“任务难度”上比很多 leather 论文更像你。
 它很适合支撑你在 LR 里写：当样本极少时，材料识别问题应该被放到 **one-shot / metric learning / similarity learning** 的框架下理解。([openaccess.thecvf.com](https://openaccess.thecvf.com/content/ICCV2023/papers/Drehwald_One-Shot_Recognition_of_Any_Material_Anywhere_Using_Contrastive_Learning_with_ICCV_2023_paper.pdf?utm_source=chatgpt.com), )

**推荐用途：**
 适合写在 **few-shot material recognition**。
 推荐程度：**非常高**

------

### 8. Bär et al. (2024)

**Title:** *Frozen Feature Augmentation for Few-Shot Image Classification*

**核心内容：**
 这篇文章研究 few-shot image classification 中的 augmentation，提出 **Frozen Feature Augmentation (FroFA)**，并指出像 **brightness** 这种看似简单的增广，在 **three architectures、three large pretraining datasets、eight transfer datasets** 上都能稳定带来 few-shot performance 提升。([openaccess.thecvf.com](https://openaccess.thecvf.com/content/CVPR2024/html/Bar_Frozen_Feature_Augmentation_for_Few-Shot_Image_Classification_CVPR_2024_paper.html?utm_source=chatgpt.com), )

**和你项目的关系：**
 这篇和你现在的训练策略高度相关。你当前用了一个很实用的 few-shot trick：**同一路径重复采样 + stochastic augmentation**。FroFA 可以帮你把这个工程策略写得更“学术化”：
 即在极少样本条件下，**augmentation 不是简单补数量，而是主动增强 feature robustness**。([openaccess.thecvf.com](https://openaccess.thecvf.com/content/CVPR2024/html/Bar_Frozen_Feature_Augmentation_for_Few-Shot_Image_Classification_CVPR_2024_paper.html?utm_source=chatgpt.com), )

**推荐用途：**
 适合写在 **few-shot transfer learning + augmentation rationale**。
 推荐程度：**高**

---

## 2. Literature Review

Recent studies suggest that leather image analysis has gradually moved from traditional handcrafted feature extraction to deep learning-based classification. In leather-specific research, Pazzaglia et al. (2021) proposed a deep learning approach for automatic leather classification in an Industry 4.0 context and evaluated pretrained convolutional neural networks such as VGG16, ResNet50, and InceptionV3 on the LASCC dataset, which contains 67 images. Although the scale of that dataset is limited, the study is still valuable because it shows that pretrained CNN backbones can be effectively adapted to leather-related visual classification tasks. Similarly, Moganam and Sathia Seelan (2022) explored multi-class leather texture defect classification using a dataset of 3,600 leather images and compared several pretrained architectures including AlexNet, VGG-16, GoogLeNet, SqueezeNet, and ResNet-50. Their results further support the feasibility of using transfer learning for leather surface analysis. Together, these studies provide a useful baseline for the present project, which also relies on a pretrained ResNet50 model for leather image classification.

However, existing leather-related studies also indicate that the most informative visual cues in leather classification are not limited to color or global appearance. Varghese et al. (2023) argued that species prediction from digital microscopic leather images depends strongly on pore-pattern variability, and their approach focused on extracting morphological, geometrical, and statistical features from highlighted pore structures. This is highly relevant to leather texture classification, because it suggests that fine-grained grain and pore patterns may be more discriminative than coarse visual appearance alone. A related contribution is the LeaData dataset introduced by Varghese et al. (2025), which contains 38,172 images from 137 leather samples and explicitly includes non-ideal grain behavior as well as variation across body parts. Compared with small and homogeneous datasets, this dataset highlights the importance of diversity, sample independence, and texture variability in leather image analysis. For the present project, this comparison is important because the current dataset contains only one source image per class, which is far smaller and less diverse than recently proposed leather benchmarks.

Beyond the leather domain itself, recent texture-recognition research suggests that standard CNN classification pipelines may not be fully sufficient for texture-heavy tasks. Varghese et al. (2025) proposed LBPMobileNet, a dual-stream architecture that combines Local Binary Pattern (LBP) texture analysis with MobileNet-based feature learning, and reported strong classification performance. Their method is especially relevant because it shows that explicit texture descriptors can complement deep neural features instead of being replaced by them. In a broader texture-recognition context, Chen et al. (2024) proposed deep tracing pattern encoding for improved texture representation and argued that local pattern encoding and cross-layer texture information are important for robust texture analysis. These studies imply that a plain ResNet50 with a simple fully connected classifier, while practical and effective as a baseline, may not be the most texture-aware solution. For this reason, future extensions of the present project could explore LBP-enhanced models, dual-stream architectures, or texture-specific heads to better capture fine-grained leather surface patterns.

Another key issue is that the current project operates under an extreme small-sample setting. Since each leather class is represented by only one original image, the task is closer to one-shot or few-shot learning than to standard supervised image classification. Drehwald et al. (2023) addressed this problem from the perspective of material recognition and introduced MatSim, described as a dataset and benchmark for one-shot recognition of materials and material states using synthetic and natural images. Their work is useful because it reframes material recognition as a similarity-learning problem when only one or a few examples are available. In addition, Bär et al. (2024) showed that frozen feature augmentation (FroFA) can consistently improve few-shot image classification across multiple architectures, pretraining datasets, and transfer datasets. This finding is directly relevant to the present project, where the same image path is repeatedly sampled with stochastic augmentation to simulate a richer training distribution. Therefore, the current training strategy can be justified not only as an engineering workaround, but also as a methodologically reasonable choice in few-shot transfer learning.

Overall, the recent literature shows three clear trends. First, leather classification has increasingly adopted pretrained deep learning models and transfer learning. Second, texture-specific information such as pore structure, local grain patterns, and explicit texture encoding remains crucial in leather image analysis. Third, when the number of samples per class is extremely limited, few-shot learning and augmentation-based transfer strategies become especially important. Based on these observations, the present leather texture classification project can be positioned as a combination of leather-domain visual recognition, fine-grained texture analysis, and extreme few-shot learning. At the same time, the literature also implies that future improvement should focus on richer and more diverse datasets, more texture-aware architectures, and more rigorous evaluation protocols with independent test data.