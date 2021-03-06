import {
  anonymous,
  autocmd,
  batch,
  bufname,
  Denops,
  fn,
  helper,
  mapping,
  option,
  unknownutil,
  vars,
} from "./deps.ts";
import { grep, GrepRecord } from "./grep.ts";

export async function main(denops: Denops): Promise<void> {
  denops.dispatcher = {
    async grep(expr: unknown) {
      if (!expr) {
        expr = await helper.input(denops, {
          prompt: "Please input grep expression:",
        });
      }
      if (expr == null) {
        await helper.echo(denops, "Cancelled.");
        return;
      }
      unknownutil.ensureString(expr);
      await openGrepBuffer(denops, expr);
    },
    async read() {
      await batch.batch(denops, async (denops) => {
        await option.modifiable.setLocal(denops, true);
        await fn.setline(
          denops,
          1,
          ((await vars.b.get(denops, "denopsgrep_content")) || []) as string[]
        );
      });
      const { expr, params } = bufname.parse(await fn.bufname(denops, "%"));
      const res = await grep(params?.expr as string, expr);
      const cs = res.map(
        (r: GrepRecord) => `${r.filename}:${r.lineno}:${r.column}:${r.content}`
      );
      await batch.batch(denops, async (denops) => {
        await vars.b.set(denops, "denopsgrep_content", cs);
        await fn.setline(denops, 1, cs);
        await option.modifiable.setLocal(denops, false);
        await option.modified.setLocal(denops, false);
      });
    },
  };

  await autocmd.group(denops, "deno_grep_sample", (helper) => {
    helper.remove();
    helper.define(
      "BufReadCmd",
      "denopsgrep://*",
      `call denops#notify("${denops.name}", "read", [])`
    );
  });

  const [id] = anonymous.add(denops, async () => {
    const expr = (await fn.expand(denops, "<cword>")) as string;
    await openGrepBuffer(denops, expr);
  });

  await batch.batch(denops, async () => {
    await mapping.map(
      denops,
      "<Plugin>(denops-grep)",
      `<Cmd>call denops#notify('${denops.name}', '${id}', [])<CR>`,
      {
        mode: "n",
        noremap: true,
      }
    );
    await mapping.map(denops, "<Leader>dg", "<Plug>(denops-grep)", {
      mode: "n",
    });
  });

  await denops.cmd(
    `command! -nargs=+ DenopsGrep call denops#notify("${denops.name}", "grep", [<q-args>])`
  );
}

async function openGrepBuffer(denops: Denops, expr: string): Promise<void> {
  const name = bufname.format({
    scheme: "denopsgrep",
    expr: Deno.cwd(),
    params: {
      expr,
    },
  });
  await denops.cmd("topleft 10split `=name`", { name });
}
