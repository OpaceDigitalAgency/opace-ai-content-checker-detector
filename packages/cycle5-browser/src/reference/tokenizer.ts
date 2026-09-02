/**
 * WordPiece tokeniser matching the Tier 3 checkpoint's BertTokenizer settings:
 * do_lower_case=true, strip_accents=null (strip while lowercasing),
 * tokenize_chinese_chars=true, never_split=null, [CLS]/[SEP] wrapping and
 * right truncation at max_len. Verified token-for-token against the
 * Hugging Face fast tokenizer on the five golden texts (see
 * public/models/local-signals-v1/golden.json).
 */
const MAX_WORD_CHARS=100;
const PUNCT_ASCII=(code:number)=>(code>=33&&code<=47)||(code>=58&&code<=64)||(code>=91&&code<=96)||(code>=123&&code<=126);
const PUNCT_UNICODE=/\p{P}/u;
const CONTROL=/[\p{Cc}\p{Cf}\p{Co}\p{Cn}]/u;
// Unicode White_Space, which is what Rust's char::is_whitespace tests — the
// property the Rust tokenizer the checkpoint was trained and served with uses
// to decide what becomes a space. A [\t\n\r \p{Zs}] class misses U+2028 LINE
// SEPARATOR, U+2029 and U+0085, which then survive as ordinary characters and
// tokenise to [UNK]. Measured on the 5,558-document fresh long-form corpus
// that put one spurious [UNK] into one GOV.UK document. U+FEFF is deliberately
// NOT here: Rust does not count it as whitespace either, and it is dropped as
// a control character below, exactly as the reference tokeniser drops it.
const WHITESPACE=/\p{White_Space}/u;
const isPunctuation=(ch:string)=>PUNCT_ASCII(ch.codePointAt(0)!)||PUNCT_UNICODE.test(ch);
const isControl=(ch:string)=>!WHITESPACE.test(ch)&&CONTROL.test(ch);
const isCjk=(code:number)=>(code>=0x4e00&&code<=0x9fff)||(code>=0x3400&&code<=0x4dbf)||(code>=0x20000&&code<=0x2a6df)||(code>=0x2a700&&code<=0x2b73f)||(code>=0x2b740&&code<=0x2b81f)||(code>=0x2b820&&code<=0x2ceaf)||(code>=0xf900&&code<=0xfaff)||(code>=0x2f800&&code<=0x2fa1f);

export class WordPieceTokenizer{
  private vocab:Map<string,number>;
  readonly clsId:number;
  readonly sepId:number;
  readonly unkId:number;
  constructor(vocabText:string){
    this.vocab=new Map();
    const lines=vocabText.split("\n");
    let index=0;
    for(const line of lines){
      const token=line.replace(/\r$/,"");
      if(token===""&&index===lines.length-1)break;
      this.vocab.set(token,index);
      index++;
    }
    this.clsId=this.vocab.get("[CLS]")!;
    this.sepId=this.vocab.get("[SEP]")!;
    this.unkId=this.vocab.get("[UNK]")!;
  }
  private cleanText(text:string){
    let out="";
    for(const ch of text){
      const code=ch.codePointAt(0)!;
      if(code===0||code===0xfffd||isControl(ch))continue;
      out+=WHITESPACE.test(ch)?" ":ch;
    }
    return out;
  }
  private spaceCjk(text:string){
    let out="";
    for(const ch of text)out+=isCjk(ch.codePointAt(0)!)?` ${ch} `:ch;
    return out;
  }
  private basicTokenize(text:string){
    const words=this.spaceCjk(this.cleanText(text)).split(/ +/u).filter(Boolean);
    const tokens:string[]=[];
    for(let word of words){
      // Lower-cased CHARACTER BY CHARACTER, not with a whole-string
      // toLowerCase(). JavaScript applies the Greek final-sigma rule to a
      // string ("ΟΛΟΣ" -> "ολος") and the Rust tokenizer the checkpoint was
      // trained and served with does not ("ολοσ"), which is a different token
      // sequence. Measured on the 5,558-document fresh long-form corpus it
      // changed the segmentation of 1 document; on Greek text it would be
      // routine. The trained model is the authority, so this matches it.
      word=[...word].map(character=>character.toLowerCase()).join("").normalize("NFD").replace(/\p{Mn}/gu,"");
      let current="";
      for(const ch of word){
        if(isPunctuation(ch)){
          if(current){tokens.push(current);current="";}
          tokens.push(ch);
        }else current+=ch;
      }
      if(current)tokens.push(current);
    }
    return tokens;
  }
  private wordPiece(word:string){
    if([...word].length>MAX_WORD_CHARS)return [this.unkId];
    const ids:number[]=[];
    let start=0;
    while(start<word.length){
      let end=word.length,id:number|undefined;
      while(start<end){
        const piece=(start>0?"##":"")+word.slice(start,end);
        const found=this.vocab.get(piece);
        if(found!==undefined){id=found;break;}
        end--;
      }
      if(id===undefined)return [this.unkId];
      ids.push(id);
      start=end;
    }
    return ids;
  }
  /**
   * WordPiece token counts for each string, with no [CLS]/[SEP] and no
   * truncation. This is what segments.ts bounds a segment by: the word-count
   * proxy it used before was measured to leave 5.78% of segments over the
   * 512-token window on the fresh long-form corpus, silently dropping their
   * ends. Counting is the same code path encode() uses, so the two can never
   * disagree about how long a passage is.
   */
  countTokens(strings:string[]){
    return strings.map(text=>{
      let total=0;
      for(const token of this.basicTokenize(text))total+=this.wordPiece(token).length;
      return total;
    });
  }
  /** [CLS] + pieces + [SEP], right-truncated so the total length is at most maxLen. */
  encode(text:string,maxLen:number){
    const ids:number[]=[];
    for(const token of this.basicTokenize(text)){
      for(const id of this.wordPiece(token)){
        ids.push(id);
        if(ids.length>=maxLen-2)break;
      }
      if(ids.length>=maxLen-2)break;
    }
    const truncated=ids.length>=maxLen-2;
    return {inputIds:[this.clsId,...ids,this.sepId],truncated};
  }
}
