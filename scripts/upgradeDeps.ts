import prompts, { Choice } from "prompts";

import { dependencies, devDependencies } from "../package.json";
import minimist from "minimist";
import { execSync } from "child_process";

type Deps = keyof typeof dependencies | keyof typeof devDependencies;

type VersionInfo = { version: string; prefix?: string };

type SelectedDependency = { dep: Deps } & VersionInfo;

const argv = minimist(process.argv.slice(2));

const DEFAULT_DEPENDENCIES_TO_UPGRADE: (string | string[])[] = [
  ["d3", "@types/d3"],
  ["echarts", "@types/echarts"],
  "page-lifecycle",
] satisfies (Deps | Deps[])[];

const PROMPTS_OPTIONS = {
  onCancel: () => {
    throw new Error("❌ Operation cancelled");
  },
};

const getTitleSuggest = (input: string, choices: Choice[]) =>
  Promise.resolve(choices.filter((choice) => choice.title.includes(input)));

const getDepVersionInfo = (dep: string) => {
  const version =
    (dependencies as Record<string, string>)[dep] ??
    (devDependencies as Record<string, string>)[dep];

  const result = /(\^|~|>|>=|<|<=)?(\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?)/.exec(
    version
  );

  if (!result) {
    return;
  }

  return { version: result[2], prefix: result.at(1) };
};

const getDependencyVersionHistory = (dep: string) => {
  const versionHistory = JSON.parse(
    execSync(`yarn info ${dep} time --json`).toString()
  ).data as Record<string, string>;

  return Object.entries(versionHistory).reduce<
    { version: string; time: number }[]
  >((result, [version, dateTime]) => {
    if (version === "created" || version === "modified") {
      return result;
    }
    result.push({
      version,
      time: new Date(dateTime).getTime(),
    });
    return result;
  }, []);
};

const selectDependencyVersion = async (dep: Deps) => {
  console.log(`\n🔍 正在获取 ${dep} 的版本信息...\n`);

  const versionInfo = getDepVersionInfo(dep);

  if (!versionInfo) {
    throw new Error(`❌ 无法解析 ${dep} 的版本信息`);
  }

  const { version, prefix } = versionInfo;

  const versionHistory = getDependencyVersionHistory(dep);

  const versionTime = versionHistory.find(
    (history) => history.version === version
  )?.time;

  if (!versionTime) {
    console.error(`❌ 未能找到 ${dep} 的 ${version} 版本信息`);
    return;
  }

  const filteredVersionHistory = versionHistory.filter(
    (history) => history.time > versionTime
  );

  if (!filteredVersionHistory.length) {
    console.log(`🆗 ${dep} 已是最新版本`);
    return;
  }

  // 按照发布日期降序排列
  filteredVersionHistory.toSorted((a, b) => b.time - a.time);

  const selectedResult = await prompts(
    {
      type: "autocomplete",
      name: "selectedVersion",
      message: `请选择 ${dep} 需要升级的版本`,
      choices: filteredVersionHistory
        .concat({ version, time: versionTime })
        .map((item) => ({
          title: `${item.version}${
            item.version === version ? " (保留当前版本)" : ""
          }`,
          value: item.version,
        })),
      suggest: getTitleSuggest,
    },
    PROMPTS_OPTIONS
  );

  const selectedVersion = selectedResult.selectedVersion;

  if (!selectedVersion) {
    throw new Error(`❌ 请选择 ${dep} 需要升级的版本`);
  }
  if (selectedVersion === version) {
    return;
  }

  return { dep, version: selectedVersion, prefix };
};

const reGenerateAPI = async () => {
  const result = await prompts({
    type: "confirm",
    name: "shouldRegenerateAPI",
    message: "是否重新生成API",
  });

  if (result.shouldRegenerateAPI) {
    console.log("todo");
  }
};

/**
 * ```bash
 * # 手动 pick
 * yarn up
 * # 使用预设
 * yarn up --preset
 * ```
 */
const main = async () => {
  const allDependencies = DEFAULT_DEPENDENCIES_TO_UPGRADE.flat() as Deps[];

  let deps = allDependencies;

  if (!argv.preset) {
    const interactResult = await prompts(
      {
        type: "autocompleteMultiselect",
        name: "depsToUpgrade",
        message: "选择需要升级的依赖",
        choices: allDependencies
          .map((value) => ({
            title: Array.isArray(value) ? value.join(" & ") : value,
            value,
          }))
          .concat(
            (Object.keys(dependencies) as Deps[])
              .filter((dep) => !allDependencies.includes(dep))
              .concat(
                (Object.keys(dependencies) as Deps[]).filter(
                  (devDep) => !allDependencies.includes(devDep)
                )
              )
              .map((value) => ({
                title: value,
                value,
              }))
          ),
        suggest: getTitleSuggest,
      },
      PROMPTS_OPTIONS
    );

    deps = interactResult.depsToUpgrade;
  }

  if (!deps.length) {
    throw new Error("❌ 请选择需要升级的依赖");
  }

  const depsToUpgrade: SelectedDependency[] = [];

  for (const dep of deps) {
    const currentSelectedDep = await selectDependencyVersion(dep);

    if (currentSelectedDep) {
      depsToUpgrade.push(currentSelectedDep);
    }
  }

  if (!depsToUpgrade.length) {
    console.log("\n👻 无可升级的依赖");
    reGenerateAPI();
    return;
  }

  const depsText = depsToUpgrade
    .map(({ dep, version, prefix }) => `${dep}@${prefix ?? ""}${version}`)
    .join(" ");

  console.log(`\n⬆️ 正在升级 ${depsText}...\n`);
  execSync(`yarn add ${depsText}`);

  console.log(
    `\n✅ 升级 ${depsToUpgrade.map(({ dep }) => dep).join(" ")} 完成\n`
  );

  reGenerateAPI();
};

main();
