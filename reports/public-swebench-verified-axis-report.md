# Axis report: swe-bench/verified

## Headline

| | |
|---|---|
| graded instances | **500** |
| checks in the suite | **500** |
| checks that have ever fired | **1** of 1 (100%) |
| subjects in the bank | 134 |
| instances that separate nothing in this bank | **0** (0%) |
| distinct catch sets | **474** |
| independent axes (antichain width) | **215** |
| redundancy (discriminating instances per distinct catch set) | 1.05× |

500 of 500 instances separate at least one subject. Between them they produce 474 distinct catch sets, of which 215 cannot be explained as one defect observed at different sensitivities.

## Provenance — read before quoting any number above

> Subjects were NOT selected against these instances: the 134 systems were submitted independently by different teams between 2023 and 2025, with no knowledge of this analysis. That independence is the point of using this corpus. The corresponding weakness is measurement noise: each cell is a single unreplicated run, SWE-bench grades one bit per instance with no check-level detail, and 216 cells are recorded as not measured because the submission published no evaluation log for them.

## The curve: what survives a stronger bank

Apparent diversity is a property of the suite *paired with its bank*. Each row removes the
most-caught remaining subject and recounts. A count that collapses on the left is a suite whose
measured richness depends on weak subjects being present.

Read the **independent axes** column, not the catch-set column. Distinct catch sets is the
statistic this report argues is inflated, and the two decay at different rates.

| weakest dropped | subjects left | distinct catch sets | **independent axes** | instances separating nothing |
|---:|---:|---:|---:|---:|
| 0 | 134 | 474 | **215** | 0 / 500 |
| 1 | 133 | 474 | **215** | 0 / 500 |
| 2 | 132 | 474 | **215** | 0 / 500 |
| 3 | 131 | 474 | **215** | 0 / 500 |
| 4 | 130 | 473 | **215** | 0 / 500 |
| 5 | 129 | 472 | **215** | 3 / 500 |
| 6 | 128 | 472 | **215** | 3 / 500 |
| 7 | 127 | 472 | **214** | 3 / 500 |
| 8 | 126 | 471 | **214** | 3 / 500 |
| 9 | 125 | 470 | **213** | 3 / 500 |
| 10 | 124 | 468 | **211** | 4 / 500 |
| 11 | 123 | 467 | **210** | 8 / 500 |
| 12 | 122 | 467 | **209** | 8 / 500 |
| 13 | 121 | 467 | **209** | 8 / 500 |
| 14 | 120 | 467 | **208** | 8 / 500 |
| 15 | 119 | 466 | **207** | 8 / 500 |
| 16 | 118 | 465 | **207** | 9 / 500 |
| 17 | 117 | 463 | **205** | 11 / 500 |
| 18 | 116 | 463 | **205** | 11 / 500 |
| 19 | 115 | 462 | **204** | 12 / 500 |
| 20 | 114 | 462 | **203** | 12 / 500 |
| 21 | 113 | 462 | **203** | 12 / 500 |
| 22 | 112 | 461 | **201** | 12 / 500 |
| 23 | 111 | 458 | **200** | 13 / 500 |
| 24 | 110 | 450 | **200** | 14 / 500 |
| 25 | 109 | 448 | **198** | 16 / 500 |
| 26 | 108 | 448 | **195** | 16 / 500 |
| 27 | 107 | 446 | **195** | 18 / 500 |
| 28 | 106 | 446 | **193** | 18 / 500 |
| 29 | 105 | 444 | **192** | 18 / 500 |
| 30 | 104 | 442 | **190** | 19 / 500 |
| 31 | 103 | 440 | **189** | 19 / 500 |
| 32 | 102 | 438 | **189** | 21 / 500 |
| 33 | 101 | 438 | **187** | 21 / 500 |
| 34 | 100 | 438 | **187** | 21 / 500 |
| 35 | 99 | 437 | **187** | 23 / 500 |
| 36 | 98 | 435 | **187** | 25 / 500 |
| 37 | 97 | 434 | **186** | 27 / 500 |
| 38 | 96 | 431 | **183** | 29 / 500 |
| 39 | 95 | 427 | **182** | 30 / 500 |
| 40 | 94 | 426 | **181** | 31 / 500 |
| 41 | 93 | 424 | **177** | 34 / 500 |
| 42 | 92 | 421 | **174** | 38 / 500 |
| 43 | 91 | 417 | **174** | 42 / 500 |
| 44 | 90 | 415 | **173** | 43 / 500 |
| 45 | 89 | 412 | **172** | 44 / 500 |
| 46 | 88 | 411 | **172** | 47 / 500 |
| 47 | 87 | 409 | **170** | 49 / 500 |
| 48 | 86 | 407 | **169** | 51 / 500 |
| 49 | 85 | 404 | **169** | 51 / 500 |
| 50 | 84 | 403 | **168** | 52 / 500 |
| 51 | 83 | 401 | **168** | 53 / 500 |
| 52 | 82 | 396 | **165** | 54 / 500 |
| 53 | 81 | 395 | **163** | 54 / 500 |
| 54 | 80 | 394 | **161** | 57 / 500 |
| 55 | 79 | 394 | **159** | 57 / 500 |
| 56 | 78 | 393 | **158** | 58 / 500 |
| 57 | 77 | 392 | **155** | 59 / 500 |
| 58 | 76 | 385 | **151** | 66 / 500 |
| 59 | 75 | 382 | **150** | 67 / 500 |
| 60 | 74 | 381 | **148** | 70 / 500 |
| 61 | 73 | 376 | **146** | 73 / 500 |
| 62 | 72 | 374 | **144** | 74 / 500 |
| 63 | 71 | 370 | **143** | 77 / 500 |
| 64 | 70 | 370 | **142** | 77 / 500 |
| 65 | 69 | 364 | **140** | 80 / 500 |
| 66 | 68 | 361 | **138** | 85 / 500 |
| 67 | 67 | 359 | **137** | 87 / 500 |
| 68 | 66 | 353 | **136** | 97 / 500 |
| 69 | 65 | 348 | **136** | 101 / 500 |
| 70 | 64 | 344 | **135** | 108 / 500 |
| 71 | 63 | 341 | **134** | 110 / 500 |
| 72 | 62 | 337 | **134** | 113 / 500 |
| 73 | 61 | 337 | **134** | 113 / 500 |
| 74 | 60 | 334 | **132** | 115 / 500 |
| 75 | 59 | 329 | **126** | 116 / 500 |
| 76 | 58 | 327 | **126** | 118 / 500 |
| 77 | 57 | 325 | **122** | 118 / 500 |
| 78 | 56 | 321 | **120** | 119 / 500 |
| 79 | 55 | 317 | **119** | 122 / 500 |
| 80 | 54 | 310 | **118** | 123 / 500 |
| 81 | 53 | 305 | **117** | 130 / 500 |
| 82 | 52 | 297 | **114** | 135 / 500 |
| 83 | 51 | 292 | **111** | 141 / 500 |
| 84 | 50 | 289 | **108** | 144 / 500 |
| 85 | 49 | 285 | **104** | 148 / 500 |
| 86 | 48 | 281 | **103** | 149 / 500 |
| 87 | 47 | 280 | **103** | 151 / 500 |
| 88 | 46 | 279 | **102** | 160 / 500 |
| 89 | 45 | 276 | **98** | 162 / 500 |
| 90 | 44 | 272 | **98** | 165 / 500 |
| 91 | 43 | 265 | **97** | 170 / 500 |
| 92 | 42 | 263 | **97** | 172 / 500 |
| 93 | 41 | 259 | **95** | 173 / 500 |
| 94 | 40 | 256 | **90** | 176 / 500 |
| 95 | 39 | 252 | **86** | 180 / 500 |
| 96 | 38 | 251 | **86** | 181 / 500 |
| 97 | 37 | 247 | **85** | 185 / 500 |
| 98 | 36 | 244 | **82** | 189 / 500 |
| 99 | 35 | 241 | **80** | 195 / 500 |
| 100 | 34 | 235 | **79** | 197 / 500 |
| 101 | 33 | 228 | **78** | 198 / 500 |
| 102 | 32 | 227 | **78** | 198 / 500 |
| 103 | 31 | 223 | **76** | 199 / 500 |
| 104 | 30 | 220 | **74** | 203 / 500 |
| 105 | 29 | 214 | **73** | 203 / 500 |
| 106 | 28 | 208 | **72** | 207 / 500 |
| 107 | 27 | 204 | **72** | 208 / 500 |
| 108 | 26 | 199 | **70** | 210 / 500 |
| 109 | 25 | 194 | **69** | 214 / 500 |
| 110 | 24 | 189 | **69** | 214 / 500 |
| 111 | 23 | 186 | **68** | 219 / 500 |
| 112 | 22 | 181 | **66** | 223 / 500 |
| 113 | 21 | 177 | **64** | 225 / 500 |
| 114 | 20 | 172 | **63** | 227 / 500 |
| 115 | 19 | 167 | **60** | 232 / 500 |
| 116 | 18 | 163 | **58** | 240 / 500 |
| 117 | 17 | 158 | **57** | 245 / 500 |
| 118 | 16 | 150 | **53** | 247 / 500 |
| 119 | 15 | 142 | **47** | 251 / 500 |
| 120 | 14 | 140 | **44** | 253 / 500 |
| 121 | 13 | 136 | **39** | 253 / 500 |
| 122 | 12 | 132 | **37** | 255 / 500 |
| 123 | 11 | 123 | **33** | 257 / 500 |
| 124 | 10 | 112 | **28** | 265 / 500 |
| 125 | 9 | 99 | **23** | 271 / 500 |
| 126 | 8 | 82 | **19** | 282 / 500 |
| 127 | 7 | 61 | **16** | 290 / 500 |
| 128 | 6 | 45 | **12** | 296 / 500 |
| 129 | 5 | 27 | **9** | 303 / 500 |
| 130 | 4 | 15 | **6** | 309 / 500 |
| 131 | 3 | 7 | **3** | 352 / 500 |
| 132 | 2 | 3 | **2** | 379 / 500 |
| 133 | 1 | 1 | **1** | 397 / 500 |

## Clusters — instances sharing one identical catch set

| catch set | size | instances |
|---|---:|---|
| `{20231010_rag_claude2, 20231010_rag_gpt35, 20231010_rag_swellama13b, 20231010_rag_swellama7b, 20240402_rag_claude3opus, 20240402_rag_gpt4, 20240402_sweagent_claude3opus, 20240402_sweagent_gpt4, 20240509_amazon-q-developer-agent-20240430-dev, 20240612_MASAI_gpt4o, 20240615_appmap-navie_gpt4o, 20240617_factory_code_droid, … +122 more}` | 12 | django__django-10999, django__django-12406, django__django-13212, django__django-14155, django__django-16502, django__django-16631, pylint-dev__pylint-4604, pylint-dev__pylint-4661, sphinx-doc__sphinx-7462, sphinx-doc__sphinx-7748, sympy__sympy-13852, sympy__sympy-20428 |
| `{20231010_rag_claude2, 20231010_rag_gpt35, 20231010_rag_swellama13b, 20231010_rag_swellama7b, 20240402_rag_claude3opus, 20240402_rag_gpt4, 20240402_sweagent_claude3opus, 20240402_sweagent_gpt4, 20240509_amazon-q-developer-agent-20240430-dev, 20240612_MASAI_gpt4o, 20240615_appmap-navie_gpt4o, 20240617_factory_code_droid, … +121 more}` | 10 | astropy__astropy-13977, django__django-11087, django__django-14034, django__django-16667, pydata__xarray-6992, pydata__xarray-7229, pylint-dev__pylint-4551, sympy__sympy-16597, sympy__sympy-20438, sympy__sympy-21930 |
| `{20231010_rag_claude2, 20231010_rag_gpt35, 20231010_rag_swellama13b, 20231010_rag_swellama7b, 20240402_rag_gpt4}` | 3 | django__django-14373, pylint-dev__pylint-6903, scikit-learn__scikit-learn-10844 |
| `{20231010_rag_claude2, 20231010_rag_gpt35, 20231010_rag_swellama13b, 20231010_rag_swellama7b, 20240402_rag_claude3opus, 20240402_rag_gpt4, 20240402_sweagent_claude3opus, 20240402_sweagent_gpt4, 20240509_amazon-q-developer-agent-20240430-dev, 20240612_MASAI_gpt4o, 20240615_appmap-navie_gpt4o, 20240617_factory_code_droid, … +121 more}` | 3 | django__django-10554, django__django-15629, matplotlib__matplotlib-26466 |
| `{20231010_rag_claude2, 20231010_rag_gpt35, 20231010_rag_swellama13b, 20231010_rag_swellama7b, 20240402_rag_claude3opus, 20240402_rag_gpt4, 20250627_agentless_MCTS-Refine-7B}` | 2 | django__django-15104, django__django-15467 |
| `{20231010_rag_claude2, 20231010_rag_gpt35, 20231010_rag_swellama13b, 20231010_rag_swellama7b, 20240402_rag_claude3opus, 20240402_rag_gpt4, 20240402_sweagent_claude3opus, 20240402_sweagent_gpt4, 20240509_amazon-q-developer-agent-20240430-dev, 20240612_MASAI_gpt4o, 20240615_appmap-navie_gpt4o, 20240617_factory_code_droid, … +121 more}` | 2 | sympy__sympy-18199, sympy__sympy-21596 |
| `{20231010_rag_gpt35, 20231010_rag_swellama13b, 20231010_rag_swellama7b, 20240509_amazon-q-developer-agent-20240430-dev, 20241029_epam-ai-run-claude-3-5-sonnet}` | 1 | django__django-13658 |
| `{20231010_rag_claude2, 20231010_rag_gpt35, 20231010_rag_swellama13b, 20231010_rag_swellama7b, 20240402_rag_claude3opus, 20250627_agentless_MCTS-Refine-7B}` | 1 | django__django-11066 |
| `{20231010_rag_gpt35, 20240402_rag_claude3opus, 20240402_rag_gpt4, 20240402_sweagent_claude3opus, 20250112_ugaiforge, 20250629_deepswerl_r2eagent}` | 1 | django__django-12155 |
| `{20231010_rag_gpt35, 20231010_rag_swellama13b, 20231010_rag_swellama7b, 20240824_gru, 20250415_openhands, 20250627_agentless_MCTS-Refine-7B}` | 1 | django__django-16569 |
| `{20231010_rag_gpt35, 20231010_rag_swellama13b, 20231010_rag_swellama7b, 20240402_rag_gpt4, 20240402_sweagent_claude3opus, 20240615_appmap-navie_gpt4o}` | 1 | pytest-dev__pytest-5809 |
| `{20231010_rag_gpt35, 20231010_rag_swellama13b, 20231010_rag_swellama7b, 20240402_rag_gpt4, 20240918_lingma-agent_lingma-swe-gpt-72b, 20250214_agentless_lite_o3_mini}` | 1 | scikit-learn__scikit-learn-12585 |
| `{20231010_rag_swellama13b, 20231010_rag_swellama7b, 20240402_rag_claude3opus, 20240402_rag_gpt4, 20240402_sweagent_claude3opus, 20250120_Bracket, 20250616_Skywork-SWE-32B}` | 1 | django__django-16255 |
| `{20231010_rag_claude2, 20231010_rag_gpt35, 20231010_rag_swellama13b, 20231010_rag_swellama7b, 20240402_rag_gpt4, 20250120_Bracket, 20250405_swe-rizzo_claude37}` | 1 | django__django-16527 |
| `{20231010_rag_claude2, 20231010_rag_gpt35, 20231010_rag_swellama13b, 20231010_rag_swellama7b, 20240402_rag_claude3opus, 20240402_rag_gpt4, 20240402_sweagent_gpt4}` | 1 | pydata__xarray-4629 |
| `{20231010_rag_gpt35, 20231010_rag_swellama13b, 20231010_rag_swellama7b, 20240402_rag_claude3opus, 20240402_rag_gpt4, 20241001_nfactorial, 20250527_amazon.nova-premier-v1.0}` | 1 | scikit-learn__scikit-learn-14496 |
| `{20231010_rag_claude2, 20231010_rag_gpt35, 20231010_rag_swellama13b, 20231010_rag_swellama7b, 20240918_lingma-agent_lingma-swe-gpt-7b, 20241002_lingma-agent_lingma-swe-gpt-7b, 20241007_nfactorial, 20251110_frogmini-14b}` | 1 | astropy__astropy-14309 |
| `{20231010_rag_gpt35, 20231010_rag_swellama13b, 20231010_rag_swellama7b, 20240402_rag_gpt4, 20240918_lingma-agent_lingma-swe-gpt-7b, 20241120_artemis_agent, 20250120_Bracket, 20250527_amazon.nova-premier-v1.0}` | 1 | django__django-11099 |
| `{20231010_rag_claude2, 20231010_rag_gpt35, 20231010_rag_swellama13b, 20231010_rag_swellama7b, 20240402_rag_claude3opus, 20241113_nebius-search-open-weight-models-11-24, 20250110_learn_by_interact_claude3.5, 20250901_entroPO_R2E_QwenCoder30BA3B_tts}` | 1 | django__django-11119 |
| `{20231010_rag_claude2, 20231010_rag_gpt35, 20231010_rag_swellama13b, 20231010_rag_swellama7b, 20240402_rag_claude3opus, 20240402_rag_gpt4, 20240615_appmap-navie_gpt4o, 20241002_lingma-agent_lingma-swe-gpt-7b}` | 1 | django__django-14089 |
| `{20231010_rag_claude2, 20231010_rag_gpt35, 20231010_rag_swellama13b, 20240402_rag_claude3opus, 20240402_rag_gpt4, 20240402_sweagent_claude3opus, 20241022_tools_claude-3-5-haiku, 20250725_sweagent_devstral_small_2507}` | 1 | django__django-14855 |
| `{20231010_rag_gpt35, 20231010_rag_swellama13b, 20231010_rag_swellama7b, 20240402_rag_gpt4, 20240728_sweagent_gpt4o, 20240918_lingma-agent_lingma-swe-gpt-7b, 20250616_Skywork-SWE-32B, 20250627_agentless_MCTS-Refine-7B}` | 1 | django__django-9296 |
| `{20231010_rag_claude2, 20231010_rag_gpt35, 20231010_rag_swellama13b, 20231010_rag_swellama7b, 20240402_rag_claude3opus, 20240402_rag_gpt4, 20240820_honeycomb, 20241120_artemis_agent}` | 1 | pytest-dev__pytest-6202 |
| `{20231010_rag_claude2, 20231010_rag_gpt35, 20231010_rag_swellama13b, 20231010_rag_swellama7b, 20240402_rag_claude3opus, 20240402_rag_gpt4, 20240402_sweagent_claude3opus, 20240402_sweagent_gpt4, 20250627_agentless_MCTS-Refine-7B}` | 1 | django__django-11880 |
| `{20231010_rag_claude2, 20231010_rag_gpt35, 20231010_rag_swellama13b, 20231010_rag_swellama7b, 20240402_rag_claude3opus, 20240402_rag_gpt4, 20241125_enginelabs, 20250627_agentless_MCTS-Refine-7B, 20250725_sweagent_devstral_small_2507}` | 1 | django__django-12143 |

*Showing 25 of 474 distinct catch sets; 449 not listed.*

## Chain decomposition

A minimum cover of the distinct catch sets by nested chains. Each chain is consistent with one
underlying defect observed at increasing sensitivity, so the number of chains — not the number
of catch sets — is the count of things the suite demonstrably measures separately.

The cover is a minimum one but not a unique one: the width is canonical, which instance lands in
which chain is not. Where catch sets are too wide to print, chains are shown as the sizes of
their nested sets; full membership is in the `json` output.

1. 6 ⊂ 7 ⊂ 9 ⊂ 28 ⊂ 75 subjects
2. 6 ⊂ 10 ⊂ 24 ⊂ 59 ⊂ 93 subjects
3. 7 ⊂ 9 ⊂ 17 ⊂ 44 ⊂ 116 subjects
4. 7 ⊂ 10 ⊂ 18 ⊂ 43 ⊂ 128 subjects
5. 8 ⊂ 13 ⊂ 32 ⊂ 60 ⊂ 108 subjects
6. 5 ⊂ 7 ⊂ 43 ⊂ 124 subjects
7. 5 ⊂ 17 ⊂ 56 ⊂ 122 subjects
8. 6 ⊂ 14 ⊂ 38 ⊂ 85 subjects
9. 9 ⊂ 19 ⊂ 61 ⊂ 133 subjects
10. 9 ⊂ 30 ⊂ 61 ⊂ 112 subjects

*Showing 10 of 215 chains (longest first); 205 not listed.*

## Calibration — is the axis count distinguishable from noise?

Exact subset nesting is unforgiving: on a large bank of single-run results, one stray
disagreement between two otherwise-identical instances splits one axis into two. So a big noisy
corpus could report a high axis count for no reason but its size. The test below destroys the
structure and keeps the noise — each subject keeps its own pass count and its own unmeasured
cells, but which instances it passes is redrawn at random.

| | axes |
|---|---:|
| **measured** | **215** |
| null model, mean of 3 trial(s) (seed 20260828) | 500.0 |
| ceiling (one axis per discriminating instance) | 500 |

The measured width is **43% of the ceiling** while randomised data with identical subject marginals scores 500.0. The compression is structural: instances genuinely fail together, and the axis count is not an artifact of bank size.

Null trials: 500, 500, 500.

## Subjects

`always-caught` subjects separate no pair of instances and are dead weight in the bank.
`never-caught` subjects are invisible to the suite: it cannot distinguish them from correct.

| subject | caught by | measured on | role |
|---|---:|---:|---|
| 20231010_rag_gpt35 | 498 | 500 | discriminating |
| 20231010_rag_swellama13b | 494 | 500 | discriminating |
| 20231010_rag_swellama7b | 493 | 500 | discriminating |
| 20240402_rag_gpt4 | 486 | 500 | discriminating |
| 20231010_rag_claude2 | 478 | 500 | discriminating |
| 20240402_rag_claude3opus | 465 | 500 | discriminating |
| 20240918_lingma-agent_lingma-swe-gpt-7b | 447 | 498 | discriminating |
| 20240402_sweagent_claude3opus | 421 | 500 | discriminating |
| 20241002_lingma-agent_lingma-swe-gpt-7b | 407 | 498 | discriminating |
| 20240402_sweagent_gpt4 | 388 | 500 | discriminating |
| 20250627_agentless_MCTS-Refine-7B | 384 | 500 | discriminating |
| 20240728_sweagent_gpt4o | 381 | 497 | discriminating |
| 20240820_epam-ai-run-gpt-4o | 378 | 498 | discriminating |
| 20240918_lingma-agent_lingma-swe-gpt-72b | 373 | 498 | discriminating |
| 20240509_amazon-q-developer-agent-20240430-dev | 372 | 500 | discriminating |
| 20241001_nfactorial | 371 | 500 | discriminating |
| 20240615_appmap-navie_gpt4o | 369 | 500 | discriminating |
| 20241016_epam-ai-run-gpt-4o | 365 | 500 | discriminating |
| 20241002_lingma-agent_lingma-swe-gpt-72b | 355 | 499 | discriminating |
| 20241128_SWE-Fixer_Qwen2.5-7b-retriever_Qwen2.5-72b-editor_20241128 | 349 | 500 | discriminating |
| 20241007_nfactorial | 342 | 500 | discriminating |
| 20250306_SWE-Fixer_Qwen2.5-7b-retriever_Qwen2.5-72b-editor | 336 | 500 | discriminating |
| 20240612_MASAI_gpt4o | 333 | 496 | discriminating |
| 20241120_artemis_agent | 333 | 493 | discriminating |
| 20240620_sweagent_claude3.5sonnet | 329 | 497 | discriminating |

*Showing 25 of 134 subjects (most-caught first); 109 not listed.*

## Checks

**1 of 1 declared checks have ever fired** against any subject in this
bank (100%). A check that has never fired is not evidence of coverage;
it may be a check that cannot fail, or a hygiene rail that is supposed to stay quiet.

| check | cells | instances | subjects |
|---|---:|---:|---:|
| unresolved | 32299 | 500 | 134 |

`subjects` is the column that matters. A check firing on every subject separates nothing; a
check firing on one separates exactly that subject.

## Coverage

66784 of 67000 cells measured (100%); 216 recorded as not measured. Unmeasured cells are excluded from catch sets rather than imputed as passes.

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, no randomness, diffable.
