/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

export const base64encode = (input: string) => Buffer.from(input).toString('base64');
export const base64decode = (input: string) => Buffer.from(input, 'base64').toString('utf-8');
