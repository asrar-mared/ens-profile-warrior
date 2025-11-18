export declare function matchAll(s: string, r: RegExp): {
    input: string;
    regex: RegExp;
    /**
     * next
     * Get the next match in single group match.
     *
     * @name next
     * @function
     * @return {String|null} The matched snippet.
     */
    next(): string | null;
    /**
     * nextRaw
     * Get the next match in raw regex output. Usefull to get another group match.
     *
     * @name nextRaw
     * @function
     * @returns {Array|null} The matched snippet
     */
    nextRaw(): RegExpExecArray | null;
    /**
     * toArray
     * Get all the matches.
     *
     * @name toArray
     * @function
     * @return {Array} The matched snippets.
     */
    toArray(): string[];
    /**
     * reset
     * Reset the index.
     *
     * @name reset
     * @function
     * @param {Number} i The new index (default: `0`).
     * @return {Number} The new index.
     */
    reset(i?: number): number;
};
//# sourceMappingURL=match-all.d.ts.map