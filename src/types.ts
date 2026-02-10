export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
}

export interface Heading {
  level: number;
  text: string;
  id: string;
}

export interface ContentResponse {
  file: string;
  html: string;
  headings: Heading[];
  raw: string;
}

export interface InfoResponse {
  mode: 'file' | 'directory';
  targetPath: string;
  version: string;
}

export interface TreeResponse {
  tree: TreeNode[];
}

export interface CliOptions {
  port: number;
  open: boolean;
  watch: boolean;
}

export interface AppContext {
  mode: 'file' | 'directory';
  targetPath: string;
  basePath: string;
  options: CliOptions;
}
