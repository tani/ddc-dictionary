import {
  BaseSource,
  Candidate,
  Context,
  DdcOptions,
  SourceOptions,
} from "https://deno.land/x/ddc_vim@v0.0.9/types.ts";
import { Denops, fn } from "https://deno.land/x/ddc_vim@v0.0.9/deps.ts";

type DictCache = {
  mtime: Date | null;
  candidates: Candidate[];
};

export class Source extends BaseSource {
  private cache: { [filename: string]: DictCache } = {};
  private dicts: string[] = [];

  private getDictionaries(dictOpt: string): string[] {
    return dictOpt.split(",");
  }

  private makeCache(): void {
    if (!this.dicts) {
      return;
    }

    for (const dictFile of this.dicts) {
      const mtime = Deno.statSync(dictFile).mtime;
      if (
        dictFile in this.cache &&
        this.cache[dictFile].mtime?.getTime() == mtime?.getTime()
      ) {
        return;
      }
      const texts = Deno.readTextFileSync(dictFile).split("\n");
      this.cache[dictFile] = {
        "mtime": mtime,
        "candidates": texts.map((word) => ({ word })),
      };
    }
  }

  async onEvent(
    denops: Denops,
    _context: Context,
    _ddcOptions: DdcOptions,
    _options: SourceOptions,
    _params: Record<string, unknown>,
  ): Promise<void> {
    this.dicts = this.getDictionaries(
      (await fn.getbufvar(denops, 1, "&dictionary") as string),
    );
    this.makeCache();
  }

  async gatherCandidates(
    _denops: Denops,
    _context: Context,
    _ddcOptions: DdcOptions,
    _options: SourceOptions,
    _params: Record<string, unknown>,
  ): Promise<Candidate[]> {
    if (!this.dicts) {
      return [];
    }

    let candidates: Candidate[] = [];
    for (const file of this.dicts) {
      candidates.concat(this.cache[file].candidates);
      candidates = candidates.concat(this.cache[file].candidates);
    }
    return candidates;
  }
}
