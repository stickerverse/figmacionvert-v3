#!/usr/bin/env python3
"""
Figma JSON Compression Tool
Compresses large JSON payloads before sending to Figma plugin
Usage: python compress-figma-json.py input.json output.json [--aggressive]
"""

import json
import sys
import base64
import re
import argparse
from typing import Dict, Any

def get_size_mb(data: Any) -> float:
    """Get size of JSON data in MB"""
    json_str = json.dumps(data, separators=(',', ':'))
    return len(json_str.encode('utf-8')) / (1024 * 1024)

def compress_images(assets: Dict[str, Any], max_size_kb: int = 50) -> int:
    """Remove images larger than max_size_kb"""
    if not assets.get('images'):
        return 0
    
    removed_count = 0
    images_to_remove = []
    
    for hash_key, asset in assets['images'].items():
        if 'base64' in asset:
            # Calculate base64 size (approximately 4/3 of original)
            base64_size_kb = (len(asset['base64']) * 0.75) / 1024
            if base64_size_kb > max_size_kb:
                images_to_remove.append(hash_key)
                removed_count += 1
    
    for hash_key in images_to_remove:
        del assets['images'][hash_key]
    
    print(f"🗑️  Removed {removed_count} images over {max_size_kb}KB")
    return removed_count

def compress_svgs(assets: Dict[str, Any], max_size_kb: int = 20) -> int:
    """Remove SVGs larger than max_size_kb"""
    if not assets.get('svgs'):
        return 0
    
    removed_count = 0
    svgs_to_remove = []
    
    for hash_key, asset in assets['svgs'].items():
        if 'svgCode' in asset:
            svg_size_kb = len(asset['svgCode'].encode('utf-8')) / 1024
            if svg_size_kb > max_size_kb:
                svgs_to_remove.append(hash_key)
                removed_count += 1
    
    for hash_key in svgs_to_remove:
        del assets['svgs'][hash_key]
    
    print(f"🗑️  Removed {removed_count} SVGs over {max_size_kb}KB")
    return removed_count

def compress_design_tokens(tokens: Dict[str, Any], aggressive: bool = False) -> None:
    """Reduce design tokens to most commonly used"""
    if not tokens:
        return
    
    max_colors = 30 if not aggressive else 15
    max_typography = 20 if not aggressive else 10
    max_spacing = 25 if not aggressive else 10
    
    # Keep top N colors by usage
    if 'colors' in tokens:
        color_items = list(tokens['colors'].items())
        # Sort by usage count if available
        try:
            color_items.sort(key=lambda x: x[1].get('usage', 0), reverse=True)
        except:
            pass
        tokens['colors'] = dict(color_items[:max_colors])
    
    # Limit typography tokens
    if 'typography' in tokens:
        typo_items = list(tokens['typography'].items())
        tokens['typography'] = dict(typo_items[:max_typography])
    
    # Limit spacing tokens
    if 'spacing' in tokens:
        spacing_items = list(tokens['spacing'].items())
        tokens['spacing'] = dict(spacing_items[:max_spacing])
    
    print(f"📝 Compressed design tokens (colors: {len(tokens.get('colors', {}))}, typography: {len(tokens.get('typography', {}))}, spacing: {len(tokens.get('spacing', {}))})")

def simplify_tree(node: Dict[str, Any], max_depth: int = 8, current_depth: int = 0) -> None:
    """Simplify element tree by removing deep nesting and metadata"""
    
    # Remove metadata that's not essential for Figma import
    metadata_to_remove = [
        'htmlMetadata', 'debugInfo', 'sourceSelector', 
        'componentSignature', 'contentHash', 'cssVariables'
    ]
    
    for key in metadata_to_remove:
        if key in node:
            del node[key]
    
    # Truncate very deep trees to prevent exponential growth
    if current_depth >= max_depth:
        if 'children' in node:
            print(f"🌳 Truncating tree at depth {current_depth}")
            node['children'] = []
        return
    
    # Recursively process children
    if 'children' in node and isinstance(node['children'], list):
        for child in node['children']:
            if isinstance(child, dict):
                simplify_tree(child, max_depth, current_depth + 1)

def compress_standard(data: Dict[str, Any]) -> Dict[str, Any]:
    """Apply standard compression"""
    print("📦 Applying standard compression...")
    
    # Compress assets
    if 'assets' in data:
        compress_images(data['assets'], max_size_kb=75)
        compress_svgs(data['assets'], max_size_kb=30)
    
    # Compress design tokens
    if 'designTokens' in data:
        compress_design_tokens(data['designTokens'], aggressive=False)
    
    # Simplify tree
    if 'tree' in data:
        simplify_tree(data['tree'], max_depth=10)
    
    return data

def compress_aggressive(data: Dict[str, Any]) -> Dict[str, Any]:
    """Apply aggressive compression"""
    print("🔥 Applying aggressive compression...")
    
    # Very restrictive asset limits
    if 'assets' in data:
        compress_images(data['assets'], max_size_kb=25)
        compress_svgs(data['assets'], max_size_kb=10)
    
    # Minimal design tokens
    if 'designTokens' in data:
        compress_design_tokens(data['designTokens'], aggressive=True)
    
    # Remove screenshot if present
    if 'screenshot' in data:
        print("🗑️  Removing screenshot")
        del data['screenshot']
    
    # Remove components data
    if 'components' in data:
        print("🗑️  Removing components data")
        data['components'] = {'definitions': {}}
    
    # Simplify tree more aggressively
    if 'tree' in data:
        simplify_tree(data['tree'], max_depth=6)
    
    # Remove optional metadata
    optional_keys = ['cssVariables', 'variants', 'extractionSummary']
    for key in optional_keys:
        if key in data:
            del data[key]
            print(f"🗑️  Removed {key}")
    
    return data

def main():
    parser = argparse.ArgumentParser(description='Compress Figma JSON payloads')
    parser.add_argument('input_file', help='Input JSON file')
    parser.add_argument('output_file', help='Output compressed JSON file')
    parser.add_argument('--aggressive', action='store_true', help='Use aggressive compression')
    parser.add_argument('--target-size', type=int, default=150, help='Target size in MB (default: 150)')
    
    args = parser.parse_args()
    
    # Load JSON
    print(f"📖 Loading {args.input_file}...")
    with open(args.input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    original_size = get_size_mb(data)
    print(f"📏 Original size: {original_size:.2f}MB")
    
    if original_size <= args.target_size:
        print(f"✅ File is already under {args.target_size}MB target")
        with open(args.output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, separators=(',', ':'))
        return
    
    # Apply compression
    if args.aggressive or original_size > 250:
        data = compress_aggressive(data)
    else:
        data = compress_standard(data)
    
    compressed_size = get_size_mb(data)
    reduction = ((original_size - compressed_size) / original_size) * 100
    
    print(f"📏 Compressed size: {compressed_size:.2f}MB")
    print(f"📉 Size reduction: {reduction:.1f}%")
    
    # Check if we need even more compression
    if compressed_size > args.target_size:
        print(f"⚠️  Still over {args.target_size}MB target, applying additional compression...")
        data = compress_aggressive(data)
        final_size = get_size_mb(data)
        print(f"📏 Final size: {final_size:.2f}MB")
    
    # Save compressed file
    print(f"💾 Saving to {args.output_file}...")
    with open(args.output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, separators=(',', ':'))
    
    print("✅ Compression complete!")
    
    if get_size_mb(data) > 200:
        print("🚨 WARNING: File is still very large. Consider capturing a smaller page.")

if __name__ == '__main__':
    main()