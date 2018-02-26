import React, { Component } from 'react'
import Fuse from 'fuse.js'
import copy from 'copy-to-clipboard'
import classnames from 'cmn/lib/classnames'
import { omit, shallowEqual } from 'cmn/lib/all'

import TAGZKEYS from './tags.json'
import logo from './logo.svg'
import './App.css'

window.shallowEqual = shallowEqual;

/*
type Tags = {
    [Tag]: Array<typeof buildKey(name, setId)>
}
type TagsData = {
    [Tag]: Array<{ origName:string, setId: SetId }>
}

type Icon = {
    htmlEntity: string,
    unicodeStr: string,
    tags: string[],
    name: string,
    origName: string,
    setId: SetId
}

type Set = {
    fileName: string, // for svg and ttf. must have ./blah.svg and ./blah.ttf
    stripPatts?: regex[],
    icons?: Icon[]
}

type IdCollection = {
    [XId]: X
}

// FUSE TYPINGS

type Indice = [number, number]
type Results = [] | [
    {
        item: Icon,
        matches: Array<{
            arrayIndex: number,
            indices: Indice[], // im thinking if fuse findAllMatches is false, then this is just the tuple
            key: string
            value: string // string that was matched
        }>
    }
]
*/

function buildKey(name, setId) {
    return `${name}----${setId}`;
}

class App extends Component {
    state = {
        isInited: false,
        seti: {
            Ionicons2: {
                fileName: 'Ionicons-2.0.1', // svg and ttf
                replacers: [
                    str => str.replace(/^ion-ios/, 'ios'),
                    str => str.replace(/^ion-android/, 'android')
                ]
            },
            Ionicons4: {
                fileName: 'Ionicons4.0.0-13',
                replacers: [
                    str => str.replace(/^ion-ios/, 'ios'),
                    str => str.replace(/^ion-android/, 'android'),
                    str => str.replace(/^ion-md/, 'md')
                ]
            },
            Material: {
                fileName: 'Material-3.0.1'
            }
        },
        icons: undefined,
        value: '',
        shouldIgnoreTags: false,
        isTagsModified: false
    }
    componentDidMount() {
        this.init();
    }

    copyJson = e => {
        e.preventDefault();

        const ICONS = {};
        for (const icon of this.state.icons) {
            const { name, setId, char } = icon;
            if (!ICONS[setId]) ICONS[setId] = {};
            ICONS[setId][name] = char;
        }
        copy(JSON.stringify(ICONS, null, 4).replace(/"(\D.*?)":/g, '$1:').replace(/\\\\u/g, '\\u').replace(/"/g, `'`));
    }

    render() {
        const { seti, icons, value, shouldIgnoreTags, isTagsModified, isInited } = this.state;

        const hasValue = !!value;
        const fuse = new Fuse(icons, {
            shouldSort: true, // only sort if has value
            includeMatches: true,
            threshold: 0.3,
            location: 0,
            distance: 100,
            maxPatternLength: 32,
            minMatchCharLength: 1,
            findAllMatches: true,
            keys: [
                'name',
                ...(shouldIgnoreTags ? [] : ['tags'])
            ],
        });
        // console.log('fuse.search(value):', fuse.search(value));
        let results;
        if (isInited) {
            if (hasValue) {
                results = fuse.search(value);
            } else {
                results = icons.map(icon => ({ item:icon }));
            }
        } else {
            results = [];
        }

        // console.log('results:', results);

        const hasResults = !!results.length;
        // if hasResults this infers that isInited is true

        return (
            <div className="App">
                { isInited &&
                    <style>
                        { Object.values(seti).map(set => set.fontFace) }
                    </style>
                }
                <header className="App-header">
                    <img src={logo} className="App-logo" alt="logo" />
                    <h1 className="App-title">Icon Font Viewer</h1>
                </header>
                <p className="App-intro">
                    <a href="#" className={classnames('Header--link', !isInited && 'Header--link-disabled')} onClick={this.copyJson}>Copy JSON</a>
                    <a href="#" className={classnames('Header--link', !isTagsModified && 'Header--link-disabled')} onClick={this.saveTags}>Save Tags</a>
                </p>
                { isInited &&
                    <div className="App-search">
                        <div className="row">
                            <b style={{ marginRight:'8px' }}>Filter:</b>
                            <input type="text" value={value} onChange={this.handleChange} />
                        </div>
                        <div className="row" style={{ marginTop:'8px' }}>
                            <input type="checkbox" id="should_ignore_tags" checked={shouldIgnoreTags} onChange={this.handleShouldIgnoreTagsCheck} />
                            <label htmlFor="should_ignore_tags" className="check-label">Ignore Tags</label>
                        </div>
                    </div>
                }
                { isInited && !hasResults &&
                    <div className="App-content">
                        No results found
                    </div>
                }
                { hasResults &&
                    <div className="App-content">
                        { results.map( ({ item:icon, item:{name, setId}, matches }) => <IconPreview key={buildKey(name, setId)} icon={icon} matches={matches} setTags={this.setTags} /> ) }
                    </div>
                }
            </div>
        );
    }

    handleShouldIgnoreTagsCheck = e => {
        const shouldIgnoreTags = e.target.checked;
        this.setState(() => ({ shouldIgnoreTags }));
    }
    handleChange = e => {
        const value = e.target.value;
        this.setState(() => ({ value }));
    }

    setTags = (icon:Icon, tags:string[]) => {
        const { name, setId } = icon;
        const { icons } = this.state;

        // const iconsNew = icons.map(icon => icon.name === name && icon.setId === setId ? { ...icon, tags:[...new Set([...icon.tags, ...tags])] } : icon); // for add
        const iconsNew = icons.map(icon => {
            if (icon.name === name && icon.setId === setId) {
                if (tags.length) {
                    return {
                        ...icon,
                        tags: [...new Set(tags)]
                    }
                } else {
                    return omit({...icon}, tags);
                }
            } else {
                return icon;
            }
        });

        this.setState(() => ({ icons:iconsNew, isTagsModified:true }));
    }

    saveTags = () => {
        const { icons } = this.state;

        const tagzKeys = {};

        for (const icon of icons) {
            if (icon.tags) {
                for (const tag of icon.tags) {
                    if (!tagzKeys[tag]) tagzKeys[tag] = [];
                    tagzKeys[tag].push(buildKey(icon.origName, icon.setId));
                }
            }
        }

        // remove duplicates
        for (const [tag, keys] of Object.entries(tagzKeys)) {
            tagzKeys[tag] = [...new Set(keys)];
        }

        download('tags.json', JSON.stringify(tagzKeys));

        this.setState(() => ({ isTagsModified:false }));

    }

    async init() {
        const { seti } = this.state;

        const iconzTags = {}; // inverse it, icon

        for (const [tag, iconKeys] of Object.entries(TAGZKEYS)) {
            for (const key of iconKeys) {
                if (!iconzTags[key]) iconzTags[key] = [];
                iconzTags[key].push(tag);
            }
        }

        const setiNew = {};
        const icons = [];
        for (const [id, set] of Object.entries(seti)) {
            const setNew = { ...set };
            setiNew[id] = setNew;

            const svgPath = await import(`./${set.fileName}.svg`);
            const ttfPath = await import(`./${set.fileName}.ttf`);

            setNew.fontFace = `
                @font-face {
                    font-family: '${id}';
                    src: url('${ttfPath}') format('truetype');
                    font-weight: normal;
                    font-style: normal;
                }
            `;

            // collect icons
            const res = await fetch(svgPath);
            const text = await res.text();

            const patt = /glyph-name="([^"]+)" unicode="([^"]+)"/g;
            let match;
            while (match = patt.exec(text)) {
                let [, name, htmlEntity] = match;

                const origName = name;

                let tags = iconzTags[buildKey(name, id)];

                // strip prefixs
                if (set.replacers) {
                    for (const replacer of set.replacers) {
                        name = replacer(name);
                    }
                }

                // replace with underscores for cleaner json (no need for quotes as with hyphen)
                name = name.replace(/-/g, '_');

                icons.push({
                    name,
                    origName,
                    htmlEntity,
                    unicodeStr: htmlEntity.replace(/&#x([0-9a-f]+);/gi, (_, code) => `\\u${'0'.repeat(Math.max(code.length-5,0))}${code}`),
                    char: htmlEntity.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16))),
                    tags,
                    setId: id
                });
            }
            // console.log('icons:', icons);
        }

        this.setState(() => ({ seti:setiNew, icons, isInited:true }));

    }
}

class IconPreview extends Component {
    timeout: number

    render () {
        const { icon:{ setId, char, name, tags }, matches } = this.props;
        // matches is optional

        return (
            <div className="IconPreview" title={setId} onClick={this.handleClick}>
                <div className="IconPreview--icon" style={{ fontFamily:setId }}>
                    { char }
                </div>
                <div className="IconPreview--name">
                    <Hilite value={name} match={matches && matches.find(match => match.key === 'name')} />
                </div>
                <div className="IconPreview--tags">
                    { tags && tags.map( (tag, ix) => <Hilite className="tagit" key={tag+ix} value={tag} match={matches && matches.find(match => match.key === 'tags' && match.value === tag)} />) }
                </div>
            </div>
        )
    }

    handleClick = e => {
        if (e.ctrlKey) {
            this.tagify();
        } else {
            this.copy();
        }
    }

    tagify = () => {
        const { setTags, icon, icon:{ tags=[] } } = this.props;
        const tagsStrNew = prompt('Modify tags. Delimit with comma and spaces', tags.join(','));
        if (tagsStrNew !== null) {
            setTags(icon, tagsStrNew.split(',').map(str => str.trim()));
        }
    }
    copy = () => copy(`name="${this.props.icon.name}" set="${this.props.icon.setId}"`)
}

class Hilite extends Component {
    render() {
        const { value, match, match:{ indices }={}, className } = this.props;
        // match is optional

        // console.log('yes this hilite has a match:', match);


        let hilited;
        if (indices) {
            const parts = [];
            parts.push(value.substring(0, indices[0][0]));
            for (let i=0; i<indices.length; i++) {
                const [st, end] = indices[i];
                // parts.push(value.substring(st, end+1));
                parts.push(<span className="hilited">{ value.substring(st, end+1) }</span>);

                if (i === indices.length - 1) {
                    parts.push(value.substring(end+1));
                } else {
                    const [nextSt] = indices[i+1]
                    parts.push(value.substring(end+1, nextSt));
                }
            }
            // console.log('value:', value, 'parts:', parts.filter(part => part));
            hilited = parts.filter(part => part);
        } else {
            hilited = value;
        }

        return <span className={className}>{hilited}</span>

    }
}

function download(filename, text) {
    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:application/json,' + encodeURIComponent(text));
    pom.setAttribute('download', filename);

    if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    }
    else {
        pom.click();
    }
}

export default App;
