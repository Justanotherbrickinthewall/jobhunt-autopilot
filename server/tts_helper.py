"""Synthesise speech with edge-tts and write an mp3 plus word timings.

Usage: python tts_helper.py <text-file> <voice> <rate> <out.mp3> <out.json>
Word boundaries need edge-tts 7+ (Communicate takes boundary="WordBoundary").
"""
import asyncio
import json
import sys

import edge_tts


async def main(text_file, voice, rate, out_mp3, out_json):
    text = open(text_file, encoding="utf-8").read()
    comm = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
    words = []
    with open(out_mp3, "wb") as audio:
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                audio.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                # offset and duration are in 100-nanosecond ticks
                start = chunk["offset"] / 10_000_000
                end = start + chunk["duration"] / 10_000_000
                words.append({"text": chunk["text"], "start": round(start, 3), "end": round(end, 3)})
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump({"words": words}, f)


if __name__ == "__main__":
    asyncio.run(main(*sys.argv[1:6]))
