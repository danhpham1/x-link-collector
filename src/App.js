import React, { useState, useMemo } from 'react';
import { Download, Link, Search, Trash2, Copy, User, MessageCircle, List, ExternalLink, Code } from 'lucide-react';
import * as XLSX from 'xlsx';

const XLinkExtractor = () => {
  const [inputText, setInputText] = useState('');
  const [exportFilename, setExportFilename] = useState('x-links');

  // Extract X/Twitter links and organize by username
  const extractedData = useMemo(() => {
    if (!inputText.trim()) return { links: [], userProfiles: {} };
    
    // Regex pattern to match various X/Twitter URL formats
    const xLinkPattern = /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/[^\s\n\r\t<>"\']*/gi;
    const matches = inputText.match(xLinkPattern) || [];
    
    // Clean and normalize URLs
    const cleanLinks = matches.map(link => {
      let cleanLink = link?.replace().trim();
       
      // Remove trailing punctuation that's not part of the URL
      cleanLink = cleanLink.replace(/[)}\],.;!?]+$/, '');
      
      if (!cleanLink.startsWith('http')) {
        cleanLink = 'https://' + cleanLink;
      }
      // Convert twitter.com to x.com for consistency
      cleanLink = cleanLink.replace('twitter.com', 'x.com');
      return cleanLink;
    });
    
    // Remove duplicates
    const uniqueLinks = [...new Set(cleanLinks)];
    
    // Group links by username
    const userProfiles = {};
    
    uniqueLinks.forEach(link => {
      try {
        const url = new URL(link);
        const pathParts = url.pathname.split('/').filter(part => part);
        
        if (pathParts.length > 0) {
          const username = pathParts[0].replace('@', '');
          
          if (!userProfiles[username]) {
            userProfiles[username] = {
              username: username,
              profileUrl: `https://x.com/${username}`,
              links: []
            };
          }
          
          userProfiles[username].links.push({
            url: link,
            type: pathParts.length === 1 ? 'profile' : 
                  pathParts.includes('status') ? 'tweet' : 
                  pathParts.includes('lists') ? 'list' : 'other',
            path: url.pathname
          });
        }
      } catch (error) {
        // If URL parsing fails, still include the link
        console.warn('Could not parse URL:', link);
      }
    });
    
    return { links: uniqueLinks, userProfiles };
  }, [inputText]);

  const extractedLinks = extractedData.links;

  // Derive tweet status links (those containing /status/<id>) for Postman usage
  const tweetLinks = useMemo(() => {
    return extractedLinks.filter(l => /\/status\/\d+/.test(l));
  }, [extractedLinks]);

  // Pretty formatted JSON array string of tweet links
  const tweetLinksArrayString = useMemo(() => {
    if (tweetLinks.length === 0) return '';
    return '[\n' + tweetLinks.map(l => `  "${l}"`).join(',\n') + '\n]';
  }, [tweetLinks]);

  const exportToExcel = () => {
    if (extractedLinks.length === 0) {
      alert('No X links found to export!');
      return;
    }

    // Prepare data for Excel - include username information
    const data = [];
    
    Object.values(extractedData.userProfiles).forEach(profile => {
      profile.links.forEach((linkData, index) => {
        data.push({
          'Username': profile.username,
          'Link Type': linkData.type.charAt(0).toUpperCase() + linkData.type.slice(1),
          'Full URL': linkData.url,
          'Domain': new URL(linkData.url).hostname,
          'Path': linkData.path
        });
      });
    });

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'X Links');

    // Auto-size columns
    const colWidths = [
      { wch: 20 },  // Username
      { wch: 12 },  // Link Type
      { wch: 60 },  // Full URL
      { wch: 15 },  // Domain
      { wch: 30 }   // Path
    ];
    ws['!cols'] = colWidths;

    // Export file
    XLSX.writeFile(wb, `${exportFilename || 'x-links'}.xlsx`);
  };

  const copyAllUsernames = () => {
    const usernames = Object.keys(extractedData.userProfiles);
    if (usernames.length === 0) return;
    
    const usernamesText = usernames.join('\n');
    navigator.clipboard.writeText(usernamesText).then(() => {
      const button = document.getElementById('copy-usernames-btn');
      const originalText = button.textContent;
      button.textContent = 'Copied!';
      setTimeout(() => {
        button.textContent = originalText;
      }, 1000);
    });
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'profile': return <User className="w-3 h-3" />;
      case 'tweet': return <MessageCircle className="w-3 h-3" />;
      case 'list': return <List className="w-3 h-3" />;
      default: return <ExternalLink className="w-3 h-3" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'profile': return 'bg-blue-100 text-blue-600';
      case 'tweet': return 'bg-green-100 text-green-600';
      case 'list': return 'bg-purple-100 text-purple-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const clearInput = () => {
    setInputText('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Link className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-medium text-gray-900">X Link Extractor</h1>
          </div>
          <p className="mt-1 text-sm text-gray-600">Extract and export X (Twitter) links from any text</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <label htmlFor="textInput" className="block text-sm font-medium text-gray-700">
                Input Text
              </label>
              {inputText && (
                <button
                  onClick={clearInput}
                  className="inline-flex items-center px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear
                </button>
              )}
            </div>
            <textarea
              id="textInput"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste your text here... The app will automatically detect X/Twitter links like https://x.com/username or twitter.com/username/status/123"
              className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
            />
          </div>
        </div>

        {/* Username Profiles Section */}
        {Object.keys(extractedData.userProfiles).length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border mb-6">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-gray-400" />
                  <h2 className="text-lg font-medium text-gray-900">
                    User Profiles ({Object.keys(extractedData.userProfiles).length})
                  </h2>
                </div>
                
                <button
                  id="copy-usernames-btn"
                  onClick={copyAllUsernames}
                  className="inline-flex items-center px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Usernames
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {Object.values(extractedData.userProfiles).map((profile) => (
                  <div key={profile.username} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">@{profile.username}</h3>
                        <a
                          href={profile.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          View Profile
                        </a>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">
                          {profile.links.length} link{profile.links.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {profile.links.map((linkData, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <div className={`w-6 h-6 rounded flex items-center justify-center ${getTypeColor(linkData.type)}`}>
                              {getTypeIcon(linkData.type)}
                            </div>
                            <span className="text-xs font-medium text-gray-600 capitalize">{linkData.type}</span>
                            <a
                              href={linkData.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 truncate"
                              title={linkData.url}
                            >
                              {linkData.path}
                            </a>
                          </div>
                          <button
                            onClick={() => navigator.clipboard.writeText(linkData.url)}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors ml-2"
                            title="Copy link"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* All Links Section */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Search className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-medium text-gray-900">
                  Found Links ({extractedLinks.length})
                </h2>
              </div>
              
              {extractedLinks.length > 0 && (
                <div className="flex items-center space-x-3">
                  <button
                    id="copy-btn"
                    onClick={() => {
                      const linksText = extractedLinks.join('\n');
                      navigator.clipboard.writeText(linksText).then(() => {
                        const button = document.getElementById('copy-btn');
                        const originalText = button.textContent;
                        button.textContent = 'Copied!';
                        setTimeout(() => {
                          button.textContent = originalText;
                        }, 1000);
                      });
                    }}
                    className="inline-flex items-center px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy All Links
                  </button>
                </div>
              )}
            </div>

            {extractedLinks.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Link className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">
                  {inputText.trim() ? 'No X links found in the text' : 'Enter some text to extract X links'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {extractedLinks.map((link, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                      </div>
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium truncate"
                        title={link}
                      >
                        {link}
                      </a>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(link)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Copy link"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tweet Links JSON Array Section */}
        {tweetLinks.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Code className="w-5 h-5 text-gray-400" />
                  <h2 className="text-lg font-medium text-gray-900">
                    Tweet Links Array (Postman) ({tweetLinks.length})
                  </h2>
                </div>
                <button
                  id="copy-tweet-array-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(tweetLinksArrayString).then(() => {
                      const button = document.getElementById('copy-tweet-array-btn');
                      if (!button) return;
                      const originalText = button.textContent;
                      button.textContent = 'Copied!';
                      setTimeout(() => { button.textContent = originalText; }, 1000);
                    });
                  }}
                  className="inline-flex items-center px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Array
                </button>
              </div>
              <div className="bg-gray-900 text-gray-100 text-xs rounded-lg p-4 overflow-x-auto font-mono border border-gray-800 relative">
                <pre className="whitespace-pre m-0">{tweetLinksArrayString}</pre>
              </div>
              <p className="mt-2 text-xs text-gray-500">Use this JSON array directly in Postman (e.g., as a body parameter list of tweet URLs).</p>
            </div>
          </div>
        )}

        {/* Export Section */}
        {extractedLinks.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Export Options</h3>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <label htmlFor="filename" className="block text-sm font-medium text-gray-700 mb-2">
                    File Name
                  </label>
                  <input
                    id="filename"
                    type="text"
                    value={exportFilename}
                    onChange={(e) => setExportFilename(e.target.value)}
                    placeholder="Enter filename (without extension)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                <div className="pt-7">
                  <button
                    onClick={exportToExcel}
                    className="inline-flex items-center px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export to Excel
                  </button>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Excel file will include username, link type, URL, domain, and path information
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-12 text-center pb-8">
        <p className="text-xs text-gray-400">
          Supports both x.com and twitter.com link formats
        </p>
      </footer>
    </div>
  );
};

// New page: convert multiline string to JSON array
const StringArrayConverter = () => {
  const [raw, setRaw] = useState('');
  const lines = useMemo(() => {
    if (!raw) return [];
    return raw.replace(/\r\n?/g, '\n').split('\n').filter(l => l.trim() !== '');
  }, [raw]);
  const jsonArray = lines.length ? '[\n' + lines.map(l => '  ' + JSON.stringify(l)).join(',\n') + '\n]' : '';
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="bg-white rounded-lg shadow-sm border mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <label htmlFor="stringInput" className="block text-sm font-medium text-gray-700">Input String (mỗi dòng =&gt; 1 phần tử)</label>
            {raw && (
              <button onClick={() => setRaw('')} className="inline-flex items-center px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors">Xóa</button>
            )}
          </div>
          <textarea
            id="stringInput"
            value={raw}
            onChange={e => setRaw(e.target.value)}
            placeholder="Dán chuỗi nhiều dòng tại đây..."
            className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
          />
        </div>
      </div>
      {lines.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-medium text-gray-900">Kết quả Array ({lines.length})</h2>
              <button
                id="copy-lines-array"
                onClick={() => {
                  navigator.clipboard.writeText(jsonArray).then(() => {
                    const btn = document.getElementById('copy-lines-array');
                    if (!btn) return;
                    const t = btn.textContent; btn.textContent = 'Đã copy!'; setTimeout(()=>{btn.textContent = t;},1000);
                  });
                }}
                className="inline-flex items-center px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >Copy Array</button>
            </div>
            <div className="bg-gray-900 text-gray-100 text-xs rounded-lg p-4 overflow-x-auto font-mono border border-gray-800">
              <pre className="whitespace-pre m-0">{jsonArray}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function App() {
  const [page, setPage] = useState('extract');
  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Link className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-medium text-gray-900">X Tools</h1>
              <p className="mt-0.5 text-xs text-gray-500">Extractor & Converter</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={()=>setPage('extract')}
              className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${page==='extract' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >Extract Links</button>
            <button
              onClick={()=>setPage('string-array')}
              className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${page==='string-array' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >String -&gt; Array</button>
          </div>
        </div>
      </div>
      <div className="flex-1">
        {page === 'extract' ? <XLinkExtractor /> : <StringArrayConverter />}
      </div>
      <footer className="mt-12 text-center pb-8">
        <p className="text-xs text-gray-400">Supports both x.com and twitter.com link formats</p>
      </footer>
    </div>
  );
}

export default App;