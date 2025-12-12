import { Request, Response } from 'express';
import OptionSettings from '../models/OptionSettings';
import logger from '../utils/logger';

const ensureSettings = async () => {
  let doc = await OptionSettings.findOne({ key: 'global' });
  if (!doc) {
    doc = new OptionSettings({ key: 'global' });
    await doc.save();
  }
  return doc;
};

export const getOptions = async (req: Request, res: Response) => {
  try {
    const doc = await ensureSettings();
    // Migrate old format (with value) to new format (label only)
    const leadStages = (doc.leadStages || []).map((stage: any) => {
      if (stage.value && !stage.label) {
        // Old format: has value but no label
        return { label: stage.value, subStages: stage.subStages || [] };
      } else if (stage.value && stage.label) {
        // Old format: has both value and label, use label
        return { label: stage.label, subStages: stage.subStages || [] };
      }
      // New format: label only
      return { label: stage.label, subStages: stage.subStages || [] };
    });
    
    res.json({ 
      success: true, 
      message: 'Options loaded', 
      data: { 
        courses: doc.courses, 
        locations: doc.locations, 
        statuses: doc.statuses,
        leadStages: leadStages
      } 
    });
  } catch (e) {
    logger.error('Get options error:', e);
    res.status(500).json({ success: false, message: 'Server error while fetching options' });
  }
};

export const updateOptions = async (req: Request, res: Response) => {
  try {
    const { courses, locations, statuses, leadStages } = req.body as { 
      courses?: string[]; 
      locations?: string[]; 
      statuses?: string[]; 
      leadStages?: Array<{ label: string; subStages: string[] }> 
    };
    const doc = await ensureSettings();
    
    // Build update object
    const updateData: any = {};
    
    if (courses !== undefined) {
      updateData.courses = courses.filter(Boolean).map(s => s.trim());
    }
    if (locations !== undefined) {
      updateData.locations = locations.filter(Boolean).map(s => s.trim());
    }
    if (statuses !== undefined) {
      updateData.statuses = statuses.filter(Boolean).map(s => s.trim());
    }
    if (leadStages !== undefined) {
      // Process leadStages - allow empty arrays for deletion
      // Handle both old format (with value) and new format (label only)
      updateData.leadStages = leadStages
        .filter(stage => stage && (stage.label || (stage as any).value))
        .map(stage => {
          // Support migration from old format (value + label) to new format (label only)
          const label = stage.label || (stage as any).value || '';
          return {
            label: label.trim(),
            subStages: (stage.subStages || []).filter(Boolean).map(s => s.trim())
          };
        });
      logger.info(`Updating leadStages: ${JSON.stringify(updateData.leadStages)}`);
    }
    
    // Update the document using updateOne with upsert to ensure the update is applied
    const updateResult = await OptionSettings.updateOne(
      { key: 'global' },
      { $set: updateData },
      { upsert: true }
    );
    logger.info(`Update result: ${JSON.stringify(updateResult)}`);
    
    // Fetch the updated document to ensure we return the latest data
    const updatedDoc = await OptionSettings.findOne({ key: 'global' });
    logger.info(`Updated doc leadStages: ${JSON.stringify(updatedDoc?.leadStages)}`);
    
    res.json({ 
      success: true, 
      message: 'Options updated', 
      data: { 
        courses: updatedDoc?.courses || [], 
        locations: updatedDoc?.locations || [], 
        statuses: updatedDoc?.statuses || [],
        leadStages: updatedDoc?.leadStages || []
      } 
    });
  } catch (e) {
    logger.error('Update options error:', e);
    res.status(500).json({ success: false, message: 'Server error while updating options' });
  }
};


