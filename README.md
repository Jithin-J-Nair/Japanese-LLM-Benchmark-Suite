# Japanese-LLM-Benchmark-Suite
敬語リライト、ビジネスメール補正、要約、翻訳、OCR整形など、日本語特化タスクでLLMを再現可能に評価するベンチマーク基盤。ダッシュボード、モデルレジストリ、HuggingFace自動検出、詳細スコア、実行履歴、日英UIを備える。
A reproducible benchmark suite for evaluating Japanese LLMs across keigo rewriting, business email correction, summarization, translation, and OCR cleanup. Includes dashboards, model registry, HuggingFace auto‑model discovery, scoring rubrics, run history, and bilingual UI.

LLM‑JP‑Bench is a fully reproducible evaluation platform for comparing Large Language Models on Japanese‑specific tasks such as keigo rewriting, business email correction, summarization, translation, and OCR cleanup.  
It provides a complete dashboard, model registry, HuggingFace auto‑model discovery, deterministic sandbox mode, detailed scoring rubrics, and exportable reports (CSV / JSON / Markdown).

Designed for AI engineers, researchers, and product teams who need reliable, transparent, and repeatable benchmarks for Japanese language workloads.

**Features**
- 5 Japanese business/NLP evaluation tasks  
- Deterministic scoring engine with explainable subscores  
- Local + API model support (GGUF, llama.cpp, vLLM, OpenAI‑compatible)  
- Automatic HuggingFace model scanning & registry refresh  
- Full dashboard: leaderboards, radar charts, latency/cost metrics  
- Run history, detailed sample inspector, exportable reports  
- Bilingual UI (Japanese / English)

**Use Cases**
- Model selection for Japanese enterprise applications  
- Research experiments  
- Internal evaluation pipelines  
- Comparing local quantized models vs API models  
- Procurement and technical decision‑making

---------------------------------
LLM‑JP‑Bench は、敬語リライト・ビジネスメール補正・要約・翻訳・OCRクリーンアップなど、**日本語特化タスク**で大規模言語モデル（LLM）を**再現可能かつ透明性のある指標で比較**するための評価基盤です。  
ダッシュボード、モデルレジストリ、HuggingFace自動モデル検出、決定的サンドボックス、詳細なルーブリック、CSV/JSON/Markdownレポート出力を備えています。

AIエンジニア、研究者、製品チームが日本語LLMを選定する際に役立つ、信頼性の高いベンチマーク環境です。

**主な機能**
- 日本語ビジネス/NLPタスク 5種の評価  
- 説明可能なサブスコア付きの決定的スコアリング  
- ローカル（GGUF / llama.cpp / vLLM）＋ API モデル対応  
- HuggingFaceモデル自動検出・レジストリ更新  
- ダッシュボード（リーダーボード・レーダーチャート・レイテンシ/コスト指標）  
- 実行履歴・サンプル検査ビュー・レポート出力  
- 日本語 / 英語の二言語UI

**利用シーン**
- 日本企業向けLLM選定  
- 研究実験・比較検証  
- 社内評価パイプライン  
- ローカル量子化モデルとAPIモデルの比較  
- 調達・技術判断のための客観的指標
