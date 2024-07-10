"use client";

import { replace } from "lodash-es";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef } from "react";

/**
 * iframe 路由修改，父页面也能同步路由
 */

function IframeSync() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const r = useMemo(() => Date.now().toString(), []);
  const { replace, query } = useRouter();

  const { searchValue, decodeSearch } = useMemo(() => {
    // const searchKey = new URLSearchParams(search).get('key') ?? '';
    const searchKey = query["key"] as string;
    const decodeSearch = decodeURIComponent(searchKey);
    const [, queryString] = decodeSearch.split("?");

    const urlSearchParams = new URLSearchParams(queryString);

    return {
      searchValue: urlSearchParams.get("keyword") ?? "",
      decodeSearch,
    };
  }, [query]);

  const iframeSrc = useMemo(() => {
    const params = new URLSearchParams();

    params.set("r", r);
    return `/childrenPath/?${params.toString()}#/${decodeSearch}`;
  }, [r, decodeSearch]);

  useEffect(() => {
    const qiYeChaIframe = iframeRef.current;
    const qiYeChaWindow = qiYeChaIframe?.contentWindow;

    if (!qiYeChaWindow) {
      return;
    }
    const childrenPageHashChangeHandler = () => {
      const currentURLHash = qiYeChaWindow.location.hash;
      // #/hash
      replace(`/dashboard?key=${encodeURIComponent(currentURLHash.slice(2))}`);
    };

    qiYeChaWindow.addEventListener("hashchange", childrenPageHashChangeHandler);

    return () =>
      qiYeChaWindow.removeEventListener("hashchange", childrenPageHashChangeHandler);
  }, [replace]);

  return (
    <div>
      <h2>Dashboard</h2>
      {/*  */}
      <iframe src={iframeSrc} frameBorder="0" ref={iframeRef}></iframe>
    </div>
  );
}

export default IframeSync;
