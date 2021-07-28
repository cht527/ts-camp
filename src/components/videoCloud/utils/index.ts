const cache: Record<string, any> = {};

export function getListConfig(i: number, total: number) {
    const cacheKey = `${i}_${total}`;
    if (cache[cacheKey]) {
        return cache[cacheKey];
    }
    const maxMarginRight = 24;
    const marginRightStep = 4;
    let marginRight = 0;

    const mid = (total - 1) / 2;
    if (mid % 1 === 0) {
        if (i < mid) {
            marginRight = maxMarginRight - (mid - i) * marginRightStep;
        } else {
            marginRight = maxMarginRight - (i + 1 - mid) * marginRightStep;
        }
    } else {
        if (i < mid - 1) {
            marginRight = maxMarginRight - (mid - 0.5 - i) * marginRightStep;
        } else if (i > mid + 1) {
            marginRight = maxMarginRight - (i - (mid - 0.5)) * marginRightStep;
        } else if (i === mid - 0.5) {
            marginRight = maxMarginRight;
        } else if (i === mid + 0.5) {
            marginRight = maxMarginRight - marginRightStep;
        }
    }
    cache[cacheKey] = {
        marginRight: i < total - 1 ? marginRight : 0
    };

    return cache[cacheKey];
}


export const toPercent = (num: string | number, dig = 2) => {
    if (num) {
        return `${(Number(num) * 100).toFixed(dig)}%`;
    }
    // 保留0位小数
    if (dig === 0) {
        return '0%';
    }
    // 保留默认位小数
    if (!dig) {
        return '0.00%';
    }
    // 保留n位小数（n>0)
    return `0.${new Array(dig).fill('0').toString().replaceAll(',', '')}%`;
};