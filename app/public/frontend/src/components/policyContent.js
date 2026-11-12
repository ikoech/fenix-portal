import { createElement, Fragment } from 'react'

const allowedTags = new Set(['p', 'br', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i'])
const ignoredTags = new Set(['script', 'style', 'iframe', 'object', 'embed'])

export function renderPolicyNodes(nodes) {
  return Array.from(nodes, (node, index) => {
    if (node.nodeType === 3) return node.textContent
    if (node.nodeType !== 1) return null

    const tag = node.tagName.toLowerCase()
    if (ignoredTags.has(tag)) return null
    const children = renderPolicyNodes(node.childNodes)
    if (!allowedTags.has(tag)) return createElement(Fragment, { key: index }, children)
    return createElement(tag, { key: index }, ...children)
  })
}

export function renderPolicyContent(html) {
  const document = new DOMParser().parseFromString(html, 'text/html')
  return renderPolicyNodes(document.body.childNodes)
}
