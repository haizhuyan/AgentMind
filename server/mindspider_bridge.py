#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
server/mindspider_bridge.py —— AgentMind ↔ MindSpider 桥接脚本
---------------------------------------------------------------------------
由 AgentMind 的 Node 后端（server/mindspider.js）以子进程方式调用，
输出纯 JSON（最后一行），供 Node 解析。

MindSpider 是 AgentMind 自带的 Python 组件（项目根目录 mindspider/，
源自 BettaFish 的 MindSpider 模块，Apache-2.0 许可，见 mindspider/LICENSE），
与 BettaFish 仓库本身无任何运行时关系。

两个子命令：
  hotlist                         13 平台聚合热搜（纯 HTTP，无需数据库/浏览器/登录）
  crawl <platform> <keyword> <max> 深度爬虫采集（Playwright/MediaCrawler，需子模块+登录态）

用法：
  python mindspider_bridge.py hotlist
  python mindspider_bridge.py crawl weibo "新能源汽车" 20

设计要点：
  - 直接复用 mindspider/ 的既有模块（NewsCollector / PlatformCrawler），
    不复制爬虫逻辑；
  - 绕开 MindSpider 的 MySQL/PostgreSQL 依赖：
      * hotlist 只调用 NewsCollector.fetch_news（纯 HTTP），数据库 engine 是惰性的；
      * crawl 直接给 PlatformCrawler.run_crawler 传入关键词（原设计从数据库话题表
        读关键词），并把 MediaCrawler 的 SAVE_DATA_OPTION 强制为 "json"，
        爬完后从 MediaCrawler/data/json 读取最新结果 —— 全程不需要数据库。
"""

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

# AgentMind 项目根目录（server/ 的上一级）
AGENTMIND_ROOT = Path(__file__).resolve().parents[1]


def _resolve_mindspider_root() -> Path:
    """解析 MindSpider 位置：优先环境变量 MINDSPIDER_ROOT，缺省 AgentMind/mindspider。"""
    env_path = os.environ.get("MINDSPIDER_ROOT", "").strip().strip('"')
    if env_path:
        return Path(env_path)
    return AGENTMIND_ROOT / "mindspider"


MINDSPIDER_ROOT = _resolve_mindspider_root()


def _inject_paths():
    """把 MindSpider 目录加入 sys.path，使其模块可导入。"""
    if not MINDSPIDER_ROOT.exists():
        raise RuntimeError(
            f"未找到 MindSpider 目录：{MINDSPIDER_ROOT}\n"
            "请确认项目根目录存在 mindspider/（AgentMind 自带组件），"
            "或在 .env 设置 MINDSPIDER_ROOT 指向它的实际位置"
            "（该变量会经 Node 后端透传给本桥接脚本）。"
        )
    for p in (str(MINDSPIDER_ROOT), str(MINDSPIDER_ROOT / "DeepSentimentCrawling")):
        if p not in sys.path:
            sys.path.insert(0, p)


# ------------------------- 热搜（轻量，无外部依赖） -------------------------

async def run_hotlist(sources=None):
    """调用 MindSpider 的 NewsCollector 抓取 13 平台聚合热搜。"""
    _inject_paths()
    try:
        from BroadTopicExtraction.get_today_news import NewsCollector, SOURCE_NAMES
    except Exception as e:
        raise RuntimeError(f"导入 NewsCollector 失败（缺依赖？请先安装 MindSpider 的 Python 依赖）：{e}")

    wanted = [s for s in (sources or []) if s in SOURCE_NAMES] or list(SOURCE_NAMES.keys())
    collector = NewsCollector()
    try:
        results = await collector.get_popular_news(wanted)
    finally:
        try:
            collector.close()
        except Exception:
            pass

    items = []
    for result in results:
        source = result.get("source", "")
        if result.get("status") != "success":
            continue
        data = result.get("data") or {}
        for it in data.get("items", []):
            # newsnow 聚合接口的常见字段（宽松解析）
            title = (
                it.get("title")
                or it.get("name")
                or it.get("word")
                or it.get("query")
                or ""
            )
            if not title:
                continue
            hot = (
                it.get("hot")
                or it.get("hotValue")
                or it.get("heat")
                or it.get("num")
                or 0
            )
            url = it.get("url") or it.get("link") or it.get("mobileUrl") or ""
            items.append(
                {
                    "title": str(title).strip(),
                    "hotnum": int(hot) if isinstance(hot, (int, float)) else 0,
                    "url": str(url),
                    "platform": SOURCE_NAMES.get(source, source),
                    "source_id": source,
                }
            )
    return {"list": items}


# ------------------------- 深度爬虫（Playwright/MediaCrawler） -------------------------

def _force_json_save_option():
    """Monkey-patch PlatformCrawler：全程 JSON 输出，绕开数据库。

    1. 补丁 create_base_config：强制 SAVE_DATA_OPTION=json；
    2. 拦截 subprocess.run：MindSpider 的 run_crawler 会在命令行写死
       --save_data_option db/postgres（覆盖我们的 json 配置并触发
       数据库初始化连接 MySQL），这里把该参数强制改为 json。
    """
    import subprocess as _sp
    from DeepSentimentCrawling import platform_crawler as pc_mod

    def patched(self, platform, keywords, crawler_type="search", max_notes=50):
        # 复用原实现的"文本替换"思路：直接改写 MediaCrawler 的 base_config.py，
        # 强制 SAVE_DATA_OPTION=json（桥接场景无需数据库）。
        base_config_path = self.mediacrawler_path / "config" / "base_config.py"
        keywords_str = ",".join(keywords)
        save_data_option = "json"

        with open(base_config_path, "r", encoding="utf-8") as f:
            content = f.read()

        lines = content.split("\n")
        new_lines = []
        skip_until_paren = False
        for line in lines:
            if skip_until_paren:
                if line.strip() == ")":
                    skip_until_paren = False
                continue
            replaced = None
            if line.startswith("PLATFORM = "):
                replaced = f'PLATFORM = "{platform}"  # 平台，xhs | dy | ks | bili | wb | tieba | zhihu'
            elif line.startswith("KEYWORDS = "):
                replaced = f'KEYWORDS = "{keywords_str}"  # 关键词搜索配置，以英文逗号分隔'
            elif line.startswith("CRAWLER_TYPE = "):
                replaced = f'CRAWLER_TYPE = "{crawler_type}"  # search(关键词搜索) | detail | creator'
            elif line.startswith("SAVE_DATA_OPTION = "):
                replaced = f'SAVE_DATA_OPTION = "{save_data_option}"  # 桥接模式：强制 json，无需数据库'
            elif line.startswith("CRAWLER_MAX_NOTES_COUNT = "):
                replaced = f"CRAWLER_MAX_NOTES_COUNT = {max_notes}"
            elif line.startswith("ENABLE_GET_COMMENTS = "):
                replaced = "ENABLE_GET_COMMENTS = True"
            elif line.startswith("CRAWLER_MAX_COMMENTS_COUNT_SINGLENOTES = "):
                replaced = "CRAWLER_MAX_COMMENTS_COUNT_SINGLENOTES = 20"
            elif line.startswith("HEADLESS = "):
                replaced = "HEADLESS = True"
            elif line.startswith("CDP_CONNECT_EXISTING = "):
                replaced = "CDP_CONNECT_EXISTING = False  # 桥接模式：自动启动本机 Chrome/Edge，无需手动开调试端口"
            elif line.startswith("CDP_HEADLESS = "):
                # 生产「无感」：默认无头执行（不弹浏览器窗口）。
                # 首次登录需设为 False 扫码：MINDSPIDER_HEADLESS=false 运行一次。
                headless = os.environ.get("MINDSPIDER_HEADLESS", "true").strip().lower()
                replaced = f"CDP_HEADLESS = {headless in ('true', '1', 'yes')}  # 桥接模式：后台无感爬取"
            if replaced is not None:
                new_lines.append(replaced)
                if line.rstrip().endswith("("):
                    skip_until_paren = True
            else:
                new_lines.append(line)

        with open(base_config_path, "w", encoding="utf-8") as f:
            f.write("\n".join(new_lines))
        return True

    pc_mod.PlatformCrawler.create_base_config = patched

    # 拦截 subprocess.run：把 --save_data_option 参数强制改为 json
    _orig_run = _sp.run

    def _patched_run(cmd, **kwargs):
        if isinstance(cmd, (list, tuple)) and "--save_data_option" in list(cmd):
            cmd = list(cmd)
            idx = cmd.index("--save_data_option")
            if idx + 1 < len(cmd):
                cmd[idx + 1] = "json"
        return _orig_run(cmd, **kwargs)

    _sp.run = _patched_run


def _latest_json_files(media_crawler_root: Path, limit: int = 10) -> list:
    """扫描 MediaCrawler/data 下最近修改的 json 输出文件。

    新版 MediaCrawler 按平台分目录输出：data/<platform>/json/search_contents_*.json。
    优先正文（*contents*）而非评论（*comments*），同类型内取最新。
    """
    data_dir = media_crawler_root / "data"
    if not data_dir.exists():
        return []
    files = []
    for p in data_dir.rglob("*.json"):
        try:
            files.append((p.stat().st_mtime, p))
        except OSError:
            continue

    def sort_key(item):
        mtime, p = item
        # contents(0) 排在 comments(1) 前；同类型按修改时间倒序
        return (0 if "contents" in p.name else 1, -mtime)

    files.sort(key=sort_key)
    return [p for _, p in files[:limit]]


def _parse_crawl_json(payload, keyword: str = None) -> dict:
    """宽松解析 MediaCrawler 输出 json 为 {texts, sources} 统一结构。

    MediaCrawler 的日文件会累积当天多次运行的结果（多个 source_keyword 混合），
    因此按请求关键词过滤：优先只保留 source_keyword 精确匹配的条目；
    若条目无 source_keyword 字段或过滤后为空，则回退返回全部。
    """
    texts = []
    sources = []
    items = []
    if isinstance(payload, list):
        items = payload
    elif isinstance(payload, dict):
        # 常见包裹结构：{key_word: [...]} 或 {list: [...]}
        for k, v in payload.items():
            if isinstance(v, list):
                items = v
                break
        if not items and isinstance(payload.get("list"), list):
            items = payload["list"]

    kw = (keyword or "").strip()
    if kw and items:
        matched = [
            it
            for it in items
            if isinstance(it, dict) and str(it.get("source_keyword") or "").strip() == kw
        ]
        if matched:
            items = matched
    for it in items:
        if not isinstance(it, dict):
            continue
        title = it.get("title") or it.get("note_title") or it.get("desc") or ""
        content = it.get("content") or it.get("desc") or it.get("brief") or ""
        text = content if content else title
        if not text:
            continue
        texts.append(str(text).strip())
        sources.append(
            {
                "title": str(title).strip() or str(content).strip()[:60],
                "url": it.get("url") or it.get("note_url") or it.get("video_url") or "",
                "provider": it.get("source_keyword") or "",
            }
        )
    return {"texts": texts, "sources": sources}


def run_crawl(platform: str, keyword: str, max_notes: int = 20):
    """真实爬虫采集：调 MindSpider PlatformCrawler，输出统一采集结构。"""
    _inject_paths()

    # 平台别名：MediaCrawler 内部代码是 wb（微博），对外同时接受 weibo/wb
    ALIAS = {"weibo": "wb", "wb": "wb", "xhs": "xhs", "dy": "dy", "ks": "ks",
             "bili": "bili", "tieba": "tieba", "zhihu": "zhihu"}
    platform = ALIAS.get((platform or "").strip().lower())
    if not platform:
        raise RuntimeError("不支持的平台：支持 weibo/xhs/dy/ks/bili/tieba/zhihu")

    try:
        from DeepSentimentCrawling.platform_crawler import PlatformCrawler
    except Exception as e:
        raise RuntimeError(
            f"导入 PlatformCrawler 失败（缺依赖？）：{e}\n"
            "请先安装 Python 依赖：pip install -r mindspider/requirements.txt"
        )

    crawler = PlatformCrawler()  # 未初始化 MediaCrawler 子模块时这里会抛 FileNotFoundError
    _force_json_save_option()

    result = crawler.run_crawler(
        platform, [keyword], login_type="qrcode", max_notes=max_notes
    )
    if not result.get("success"):
        raise RuntimeError(
            f"MindSpider 爬取失败（{platform}）：{result.get('error', '未知错误')}。"
            "首次使用需扫码登录平台（请在本机有界面的环境运行，或删除 MediaCrawler/browser_data 重新登录）。"
        )

    # 读取 MediaCrawler 的 json 输出
    media_root = Path(crawler.mediacrawler_path)
    parsed = {"texts": [], "sources": [], "raw": None}
    scanned = False
    for f in _latest_json_files(media_root):
        try:
            with open(f, "r", encoding="utf-8") as fh:
                payload = json.load(fh)
        except Exception:
            continue
        scanned = True
        one = _parse_crawl_json(payload, keyword=keyword)
        if one["texts"]:
            parsed = {"texts": one["texts"], "sources": one["sources"], "raw_file": str(f)}
            break
    if not parsed["texts"]:
        if scanned:
            raise RuntimeError(
                f"爬取完成但结果为 0 条（平台 {platform} 未返回「{keyword}」的内容，"
                "可换关键词重试，或适当增大采集条数）。"
            )
        raise RuntimeError(
            f"爬取完成但未找到 MediaCrawler 输出文件。平台：{platform}，关键词：{keyword}"
        )
    return parsed


# ------------------------- 入口 -------------------------

def main():
    # Windows 控制台默认 GBK，会导致中文/特殊字符输出异常；
    # 桥接脚本面向 Node 子进程，统一强制 UTF-8。
    for stream in (sys.stdout, sys.stderr):
        if stream and hasattr(stream, "reconfigure"):
            try:
                stream.reconfigure(encoding="utf-8", errors="replace")
            except Exception:
                pass

    parser = argparse.ArgumentParser(description="AgentMind ↔ MindSpider 桥接")
    sub = parser.add_subparsers(dest="cmd", required=True)
    p_ping = sub.add_parser("ping", help="环境自检（仅探测解释器与组件位置，不联网）")
    p_hot = sub.add_parser("hotlist", help="13 平台聚合热搜")
    p_hot.add_argument("--sources", nargs="*", default=None, help="限定新闻源 id（如 weibo zhihu）")

    p_crawl = sub.add_parser("crawl", help="深度爬虫采集")
    p_crawl.add_argument("platform", help="平台：xhs|dy|ks|bili|wb|tieba|zhihu")
    p_crawl.add_argument("keyword", help="采集关键词")
    p_crawl.add_argument("max_notes", type=int, nargs="?", default=20, help="最大条数（默认 20）")

    args = parser.parse_args()
    try:
        if args.cmd == "ping":
            result = {
                "ok": True,
                "mindspider": str(MINDSPIDER_ROOT),
                "exists": MINDSPIDER_ROOT.exists(),
                "python": sys.executable
            }
        elif args.cmd == "hotlist":
            result = asyncio.run(run_hotlist(args.sources))
        else:
            result = run_crawl(args.platform, args.keyword, args.max_notes)
    except Exception as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
        sys.exit(1)

    print(json.dumps(result, ensure_ascii=False, default=str))
    sys.exit(0)


if __name__ == "__main__":
    main()
