import { NextRequest, NextResponse } from "next/server";

interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: Array<{
    definition: string;
    example?: string;
    synonyms?: string[];
    antonyms?: string[];
  }>;
}

interface DictionaryPhonetic {
  text?: string;
  audio?: string;
}

interface DictionaryApiResponse {
  word: string;
  phonetic?: string;
  phonetics?: DictionaryPhonetic[];
  meanings: DictionaryMeaning[];
}

interface DatamuseWord {
  word: string;
  score: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ word: string }> }
) {
  try {
    const { word: rawWord } = await params;
    const word = decodeURIComponent(rawWord || "").trim().toLowerCase();

    if (!word || word.length > 50 || /[^a-zA-Z\s-]/.test(word)) {
      return NextResponse.json(
        { error: "Invalid word query" },
        { status: 400 }
      );
    }

    // Gọi song song Free Dictionary API và Datamuse API (Collocations & Related words)
    const [dictResult, collocationsResult, synonymsResult] = await Promise.allSettled([
      fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, {
        next: { revalidate: 86400 }, // Cache 24 hours
      }).then(async (r) => (r.ok ? ((await r.json()) as DictionaryApiResponse[]) : null)),

      fetch(`https://api.datamuse.com/words?rel_jja=${encodeURIComponent(word)}&max=6`, {
        next: { revalidate: 86400 },
      }).then(async (r) => (r.ok ? ((await r.json()) as DatamuseWord[]) : [])),

      fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(word)}&max=6`, {
        next: { revalidate: 86400 },
      }).then(async (r) => (r.ok ? ((await r.json()) as DatamuseWord[]) : [])),
    ]);

    const dictData = dictResult.status === "fulfilled" ? dictResult.value : null;
    const collocations =
      collocationsResult.status === "fulfilled" && Array.isArray(collocationsResult.value)
        ? collocationsResult.value.map((c) => c.word)
        : [];
    const synonymsFromDatamuse =
      synonymsResult.status === "fulfilled" && Array.isArray(synonymsResult.value)
        ? synonymsResult.value.map((s) => s.word)
        : [];

    if (!dictData || !dictData[0]) {
      // Fallback nếu không có trên dictionaryapi.dev nhưng có trên Datamuse
      if (collocations.length > 0 || synonymsFromDatamuse.length > 0) {
        return NextResponse.json(
          {
            word,
            phonetic: null,
            audio: null,
            meanings: [],
            collocations,
            synonyms: synonymsFromDatamuse,
            source: "datamuse_fallback",
          },
          {
            headers: {
              "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
            },
          }
        );
      }

      return NextResponse.json(
        { error: `Word '${word}' not found` },
        { status: 404 }
      );
    }

    const firstEntry = dictData[0];

    // Tìm IPA chuẩn
    const phoneticText =
      firstEntry.phonetic ||
      firstEntry.phonetics?.find((p) => p.text)?.text ||
      null;

    // Tìm audio URL (ưu tiên file mp3 có âm thanh)
    const audioUrl =
      firstEntry.phonetics?.find((p) => p.audio && p.audio.endsWith(".mp3"))?.audio ||
      firstEntry.phonetics?.find((p) => p.audio)?.audio ||
      null;

    // Tổng hợp meanings
    const meanings = (firstEntry.meanings || []).map((m) => ({
      partOfSpeech: m.partOfSpeech,
      definitions: (m.definitions || []).slice(0, 3).map((d) => ({
        definition: d.definition,
        example: d.example || null,
        synonyms: d.synonyms?.slice(0, 4) || [],
      })),
    }));

    return NextResponse.json(
      {
        word: firstEntry.word || word,
        phonetic: phoneticText,
        audio: audioUrl,
        meanings,
        collocations,
        synonyms: synonymsFromDatamuse,
        source: "free_dictionary_api",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("GET /api/dictionary/[word] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
