import React from 'react';
import MarkdownDocs from "../../src/modules/components/MarkdownDocs";
import {prepareMarkdown} from "../../src/modules/utils/parseMarkdown";

const pageFilename = 'getting-started/installation';
const requireDemo = require.context(
  '../../src/pages/getting-started/installation',
  false,
  /\.(js|tsx)$/,
);
const requireRaw = require.context(
  '!raw-loader!../../src/pages/getting-started/installation',
  false,
  /\.(js|md|tsx)$/,
);

export default function Page({demos, docs}) {
  return <MarkdownDocs demos={demos} docs={docs} requireDemo={requireDemo}/>;
}

Page.getInitialProps = () => {
  const {demos, docs} = prepareMarkdown({pageFilename, requireRaw});
  // console.log(demos);
  // console.log(docs);
  return {demos, docs};
};
