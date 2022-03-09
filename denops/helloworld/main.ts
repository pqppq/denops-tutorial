import { Denops } from "https://deno.land/x/denops_std@v1.0.0/mod.ts";
import { Maze } from "https://deno.land/x/maze_generator@v0.4.0/mod.js";
import { execute } from "https://deno.land/x/denops_std@v1.0.0/helper/mod.ts";
import { ensureString } from "https://deno.land/x/unknownutil@v1.0.0/mod.ts";

export async function main(denops: Denops): Promise<void> {
  denops.dispatcher = {
    async maze(opener: unknown): Promise<void> {
      ensureString(opener);
      const [xSize, ySize] = (await denops.eval("[&columns, &lines]")) as [
        number,
        number
      ];

      const maze = new Maze({
        xSize: xSize / 3,
        ySize: ySize / 3,
      }).generate();

      const content = maze.getString();
      await denops.cmd(opener || "new");
      await denops.call("setline", 1, content.split(/\r?\n/g));
      await execute(
        denops,
        `
				setlocal bufhidden=wipe buftype=nofile
				setlocal nobackup noswapfile
				setlocal nomodified nomodifiable`
      );
    },
  };

  await denops.cmd(
    `command! -nargs=? -bar Maze call denops#request('${denops.name}', 'maze', [<q-args>])`
  );
}
