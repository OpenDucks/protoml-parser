const path = require("path");

const BUILTIN_MACRO_DIR = path.resolve(__dirname, "..", "..", "macros");

const BUILTIN_MACRO_HASHES = {
  "actions/actions_item.pml": "445d7f86ac44837152e5241ae79f15a1b6d1b392030442f5504f9d6452ba7ea8",
  "actions/actions_status.pml": "956d4f8883fd21a6b7c86ff71285cfb35e06a5f7a8a86e213c44249cbb3a9569",
  "alert.pml": "fa0e57ee80a0087ec7c5cc416415760c00741b5dd3eaf1e4497d81fee9693594",
  "badge.pml": "e5a7e334085d4134568277d141c57492560e4e128a39deded1f0de45c9381b87",
  "calendar_event.pml": "8e516f3f681f2bf0324ea8450035faa776d1c37b99c5c513f44664d9fa86249e",
  "clicktoreveal.pml": "2547d3672c60d6c90897a5e15d2800c5739921c46fb146524a76595abb7e6aa3",
  "codeblock_copy.pml": "a4fa98724307da39e73648e2d5d48539959522a2952e247980441d7c59710a67",
  "decisions/decision_entry.pml": "91379babbd99d524178c08742f86cfe17e686b2b251d7803791f0c5fa5c1d673",
  "decisions/vote_result.pml": "84d88339fb13e5bf7618c3f51715e9e58c7d59880dba5e7b39209ae1958c7907",
  "finance/f_end.pml": "46031e7f790ca90de6331d3836c0c3c232dbef07fb6b1ee3594639f1ab0c1077",
  "finance/f_entry.pml": "0c904db344ed9d4d2fe624def9d01d251dc64d0df348750d16469579f1b6616a",
  "finance/f_start.pml": "dccee2fc04f47119d3a0c5072204145efd0918129ff87aff29dd025e6a61ac42",
  "finance/f_totals.pml": "4345491cdf38701821303c02fe0046e2ee380598e07ab8fc79d25cde64e9a0b1",
  "highlight/highlight_issue.pml": "244a8c5470b97b2afda1923fc0a57b62fc38a209ceb76fbb19aee3ca89eb2f6b",
  "highlight/highlight_warning.pml": "6960d08faf77c53a92722fa074673b98f590ec374e3b984554e014466b8555b5",
  "highlight/highlight_working_on.pml": "c5710ff2a438a8854a89996590a3e8378bf08bd430f759529f8051497af37ef1",
  "highlight/hightlight_success.pml": "e5aeb5bbdacb483ff87165c68bfc5fdc01f3cfb41d30831d36f8efee121b250d",
  "image.pml": "2bc49c046ef0921056021957f61da38e8e46db2b523e36de034dabb2e4deb927",
  "progress_bar.pml": "50926cb382ad51b6464692bc7075bca710e3aef3d8a1107437d28ba2faa14ae2",
  "quote.pml": "0e9eedda62a4a9e3f93ba58a327e642d327864e6d3addfdf9b2869d6335ee908",
  "score_card.pml": "5edc1c86968659a1e2e230ff9ce6c8ff4af221c80ffd16ef6d9c89f5950fea95",
  "spoiler.pml": "1b35bd703a662dab248fb723b4ea549d33b18af7ab67a339016dff7daa2ca662",
  "summary/meeting_summary.pml": "59c14b2d41c12bf7d2263a4c6e9cc658f7c476c89b6a3bb9b192b761928a84d0",
  "taskflow/taskflow_end.pml": "124d5384266a1f45aa842b572abf51e0b3e993bdd31ac69d4e7b400a222a0be0",
  "taskflow/taskflow_phase.pml": "724a76b4d74351a4f0df434473ca4190ef5ffd34600c6325a7e99ddaea851792",
  "taskflow/taskflow_task.pml": "a7dc96ef14a29e6fe5cc1685444611d5b20c92df2d903a790d65e235419ae0b2",
  "timeline/timeline_end.pml": "89bb4395648ed2256f1a1656cb5f378bf4ef7a6ee082eda8f3a1808d0bbf48da",
  "timeline/timeline_entry.pml": "a8d6f079c9597ecb7b0a94477ebf5a51b54f4822f63bedfab8bdddd6d6da5bfd",
  "timeline/timeline_start.pml": "468029b511513d47425082094c73649207a403cf0ed25b259f3712a99ca843c0",
  "tts.pml": "03f4e691e1d36f10df8afd47912b0f38f185c4090f66963d7c53b3e0f8834fb3",
  "warn_box.pml": "aa15b993b6d600a8808479757a36974103b6bc9a628c6563caa39afec8b44b15",
};

module.exports = {
  BUILTIN_MACRO_DIR,
  BUILTIN_MACRO_HASHES,
};
